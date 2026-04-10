import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { setDefaultResultOrder } from 'node:dns';
import compression from 'compression';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';

// Force DNS resolution to prioritize IPv4 over IPv6. 
// This is critical for connecting to external services (like Gmail SMTP) 
// on cloud providers like Render that do not have IPv6 routing configured.
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable compression for large responses
  app.use(compression());

  // Security headers
  app.use(helmet());
  
  // Custom Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Enable CORS for frontend requests
  app.enableCors({
    origin: (origin, callback) => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const allowedOrigins = [
        frontendUrl,
        frontendUrl.replace(/\/$/, ''), // Remove trailing slash
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];
      
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Global validation pipe for Request Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Sanitization Pipe for XSS and Trimming
  app.useGlobalPipes(new SanitizationPipe());

  const port = process.env.PORT || 4000; // Using 4000 to avoid clash with Next.js dashboard
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}`);
}
bootstrap();
