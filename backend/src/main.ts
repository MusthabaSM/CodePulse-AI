import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // Enable CORS for Next.js UI
  app.use(helmet()); // Enable Security Headers
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // OpenAPI (Swagger) Configuration
  const aiProvider = process.env.AI_PROVIDER || 'not set';
  const geminiKeyPresent = !!process.env.GEMINI_API_KEY;
  console.log(`[Startup] AI_PROVIDER=${aiProvider}`);
  console.log(`[Startup] GEMINI_API_KEY_PRESENT=${geminiKeyPresent}`);

  const config = new DocumentBuilder()
    .setTitle('CodePulse AI Enterprise API')
    .setDescription(
      'The core backend API for managing repository analysis, technical debt scoring, and business impact financialization.',
    )
    .setVersion('1.0')
    .addTag('repositories')
    .addTag('analysis')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(4000, '0.0.0.0');
}
bootstrap();
