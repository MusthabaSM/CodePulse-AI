import { Injectable, Logger, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderType } from '@prisma/client';
import { SecretManagerProvider } from '../config/secrets/secret-manager.interface';

@Injectable()
export class VcsAuthService {
  private readonly logger = new Logger(VcsAuthService.name);
  private readonly algorithm = 'aes-256-gcm';
  private secretKey: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('SecretManagerProvider') private readonly secrets: any
  ) {}

  private async getEncryptionKey(): Promise<string> {
    if (this.secretKey) return this.secretKey;
    
    let key = await this.secrets.getSecret('ENCRYPTION_KEY');
    if (!key) {
      key = crypto.randomBytes(32).toString('hex').slice(0, 32);
      this.logger.warn('ENCRYPTION_KEY not found in secret manager, using ephemeral key');
    }
    this.secretKey = key;
    return this.secretKey || '';
  }

  async encrypt(text: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  async decrypt(encryptedText: string): Promise<string> {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const key = await this.getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(key), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async storeToken(organizationId: string, provider: ProviderType, token: string, refreshToken?: string, installationId?: string) {
    const encryptedToken = await this.encrypt(token);
    const encryptedRefreshToken = refreshToken ? await this.encrypt(refreshToken) : null;

    return this.prisma.vcsIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider
        }
      },
      update: {
        accessToken: encryptedToken,
        refreshToken: encryptedRefreshToken,
        installationId,
      },
      create: {
        organizationId,
        provider,
        accessToken: encryptedToken,
        refreshToken: encryptedRefreshToken,
        installationId,
      },
    });
  }

  async getToken(organizationId: string, provider: ProviderType): Promise<string | null> {
    const integration = await this.prisma.vcsIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider
        }
      },
    });

    if (!integration) {
      return null;
    }

    return this.decrypt(integration.accessToken);
  }
}
