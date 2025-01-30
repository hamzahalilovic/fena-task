import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QueueConsumer } from './queue/queue.consumer';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Main');

  // enabled CORS to allow frontend requests

  app.enableCors();


  const queueConsumer = app.get(QueueConsumer);
  await queueConsumer.consumeJobs();


  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Backend is running on http://localhost:${port}`);

  // graceful shutdown handler
  process.on('SIGINT', async () => {
    logger.warn('shutting down gracefully');
    await queueConsumer.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.warn('shutting down gracefully');
    await queueConsumer.shutdown();
    process.exit(0);
  });
}
bootstrap();