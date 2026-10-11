import { Module, forwardRef, Logger } from '@nestjs/common';
import { AiConsultantController } from './ai-consultant.controller';
import { AiConsultantService } from './ai-consultant.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { AnalysisModule } from '../analysis/analysis.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    forwardRef(() => AnalysisModule),
    AnalyticsModule,
  ],
  controllers: [AiConsultantController],
  providers: [
    AiConsultantService, 
    GeminiProvider,
    OllamaProvider,
    {
      provide: 'LLM_PROVIDER',
      useFactory: (gemini: GeminiProvider, ollama: OllamaProvider) => {
        const logger = new Logger('AiModule');
        const providerName = process.env.AI_PROVIDER || 'gemini';
        logger.log(`Selecting AI Provider: ${providerName}`);
        return providerName === 'ollama' ? ollama : gemini;
      },
      inject: [GeminiProvider, OllamaProvider],
    }
  ],
  exports: [AiConsultantService],
})
export class AiModule {}
