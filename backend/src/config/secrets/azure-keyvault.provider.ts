import { Injectable, Logger } from '@nestjs/common';
import { SecretManagerProvider } from './secret-manager.interface';

/**
 * Stub implementation for Azure Key Vault.
 * In a real environment, you would use @azure/keyvault-secrets
 */
@Injectable()
export class AzureKeyVaultProvider implements SecretManagerProvider {
  private readonly logger = new Logger(AzureKeyVaultProvider.name);

  async getSecret(key: string): Promise<string | undefined> {
    this.logger.log(`Fetching secret ${key} from Azure Key Vault`);
    throw new Error('Azure Key Vault not fully configured in stub');
  }

  async setSecret(key: string, value: string): Promise<void> {
    this.logger.log(`Setting secret ${key} in Azure Key Vault`);
    throw new Error('Azure Key Vault not fully configured in stub');
  }

  async deleteSecret(key: string): Promise<void> {
    this.logger.log(`Deleting secret ${key} from Azure Key Vault`);
    throw new Error('Azure Key Vault not fully configured in stub');
  }
}
