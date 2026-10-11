import { Injectable, Logger } from '@nestjs/common';
import { SecretManagerProvider } from './secret-manager.interface';

/**
 * Stub implementation for HashiCorp Vault.
 * In a real environment, you would use node-vault
 */
@Injectable()
export class HashiCorpVaultProvider implements SecretManagerProvider {
  private readonly logger = new Logger(HashiCorpVaultProvider.name);

  async getSecret(key: string): Promise<string | undefined> {
    this.logger.log(`Fetching secret ${key} from HashiCorp Vault`);
    throw new Error('HashiCorp Vault not fully configured in stub');
  }

  async setSecret(key: string, value: string): Promise<void> {
    this.logger.log(`Setting secret ${key} in HashiCorp Vault`);
    throw new Error('HashiCorp Vault not fully configured in stub');
  }

  async deleteSecret(key: string): Promise<void> {
    this.logger.log(`Deleting secret ${key} from HashiCorp Vault`);
    throw new Error('HashiCorp Vault not fully configured in stub');
  }
}
