import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // CORREÇÃO 1: Adiciona o prefixo global /api para alinhar com os rewrites do Next.js
  app.setGlobalPrefix('api');

  // ── Segurança de cabeçalhos HTTP ──────────────────────────────
  // CORREÇÃO 2: Atualizado connectSrc para permitir conexões do frontend em desenvolvimento e produção
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3002", process.env.FRONTEND_URL ?? ""],
        },
      },
      frameguard: { action: 'deny' },
    }),
  );

  // ── Cookie parser (necessário para JWT em cookie HttpOnly) ────
  app.use(cookieParser());

  // ── Validação global de DTOs ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Serialização (oculta @Exclude nas entidades) ───────────────
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── CORS ───────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true, // necessário para cookies cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  logger.log(`Backend rodando na porta ${port} (${process.env.NODE_ENV ?? 'development'})`);
}
bootstrap();