import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { setDefaultResultOrder } from 'node:dns';

// Force DNS resolution to prioritize IPv4 over IPv6. 
// This is critical for connecting to external services (like Gmail SMTP) 
// on cloud providers like Render that do not have IPv6 routing configured.
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend requests
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001', // Next.js
    credentials: true,
  });

  // Global validation pipe for Request Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const port = process.env.PORT || 4000; // Using 4000 to avoid clash with Next.js dashboard
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}`);
}
bootstrap();
