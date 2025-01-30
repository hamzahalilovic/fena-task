import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // enabled CORS to allow frontend requests
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);

  console.log('backend is running on http://localhost:3000');
}
bootstrap();
