import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Main');
   // enabled CORS to allow frontend requests


  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Backend is running on http://localhost:${port}`);

  // graceful shutdown handler
  process.on('SIGINT', async () => {
    logger.warn('Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.warn('Shutting down gracefully');
    await app.close();
    process.exit(0);
  });
}
bootstrap();
