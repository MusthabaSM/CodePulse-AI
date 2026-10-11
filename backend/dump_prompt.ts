import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AiConsultantService } from './src/ai/ai-consultant.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const prisma = app.get('PrismaService');
  const repo = await prisma.repository.findFirst();
  const repoId = repo ? repo.id : 'global';

  const businessMetricsService = app.get('BusinessMetricsService');
  const businessMetrics = await businessMetricsService.calculateMetrics(repoId, { hourlyRate: 75, teamSize: 5 });
  
  const aiService = app.get(AiConsultantService);
  const prompt = aiService['buildSystemPrompt'](businessMetrics);
  
  console.log("---- ACTUAL SYSTEM PROMPT ----");
  console.log(prompt);
  console.log("------------------------------");

  await app.close();
}
bootstrap();
