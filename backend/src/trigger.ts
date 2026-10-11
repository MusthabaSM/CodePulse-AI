import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AnalysisController } from './analysis/analysis.controller';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const controller = app.get(AnalysisController);
  const req = { user: { id: 'user_3Eu71MJ2lmD4jV16jzoHhxEHpko' } };
  
  try {
    const res = await controller.triggerAnalysis(req as any, {
      url: 'https://github.com/MusthabaSM/Loan_Approval',
      owner: 'MusthabaSM',
      repo: 'Loan_Approval'
    });
    console.log("Triggered successfully:", res);
  } catch (err) {
    console.error("Failed to trigger:", err);
  }
  
  await app.close();
}
bootstrap();
