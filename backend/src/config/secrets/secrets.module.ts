import { Module, Global } from '@nestjs/common';
import { LocalEnvProvider } from './local-env.provider';
import { AwsSecretsProvider } from './aws-secrets.provider';
import { AzureKeyVaultProvider } from './azure-keyvault.provider';
import { HashiCorpVaultProvider } from './hashicorp-vault.provider';

@Global()
@Module({
  providers: [
    {
      provide: 'SecretManagerProvider',
      useFactory: () => {
        const type = process.env.SECRET_MANAGER_TYPE || 'local';
        switch (type) {
          case 'aws':
            return new AwsSecretsProvider();
          case 'azure':
            return new AzureKeyVaultProvider();
          case 'vault':
            return new HashiCorpVaultProvider();
          case 'local':
          default:
            return new LocalEnvProvider();
        }
      },
    },
  ],
  exports: ['SecretManagerProvider'],
})
export class SecretsModule {}
