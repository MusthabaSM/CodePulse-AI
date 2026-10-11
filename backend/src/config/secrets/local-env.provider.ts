import { Injectable, Logger } from '@nestjs/common';
import { SecretManagerProvider } from './secret-manager.interface';

@Injectable()
export class LocalEnvProvider implements SecretManagerProvider {
  private readonly logger = new Logger(LocalEnvProvider.name);

  async getSecret(key: string): Promise<string | undefined> {
    this.logger.debug(`Fetching secret ${key} from LocalEnvProvider`);
    return process.env[key];
  }

  async setSecret(key: string, value: string): Promise<void> {
    this.logger.warn(`Setting secret ${key} in LocalEnvProvider (Not persistent across restarts)`);
    process.env[key] = value;
  }

  async deleteSecret(key: string): Promise<void> {
    this.logger.warn(`Deleting secret ${key} in LocalEnvProvider`);
    delete process.env[key];
  }
}
