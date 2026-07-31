import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { initializeFirebase } from './firebase.config';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import { timingSafeEqual } from 'crypto';

dotenv.config();
initializeFirebase();

const safeCompare = (value: string, expected: string): boolean => {
  const valueBuffer = Buffer.from(value) as any;
  const expectedBuffer = Buffer.from(expected) as any;

  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
};

const protectSwagger = (req: Request, res: Response, next: NextFunction) => {
  const swaggerPath =
    req.path === '/api' ||
    req.path.startsWith('/api/') ||
    req.path === '/api-json' ||
    req.path === '/api-yaml';

  if (!swaggerPath) return next();

  const authorization = req.headers.authorization;

  if (authorization?.startsWith('Basic ')) {
    try {
      const credentials = Buffer.from(
        authorization.slice('Basic '.length),
        'base64',
      ).toString('utf8');
      const separator = credentials.indexOf(':');
      const username = credentials.slice(0, separator);
      const password = credentials.slice(separator + 1);
      const expectedUsername = process.env.SWAGGER_USERNAME || 'admin';
      const expectedPassword = process.env.SWAGGER_PASSWORD || '!password@';

      if (
        separator > 0 &&
        safeCompare(username, expectedUsername) &&
        safeCompare(password, expectedPassword)
      ) {
        return next();
      }
    } catch {
      // The challenge below handles malformed credentials.
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger documentation"');
  return res.status(401).send('Authentication required');
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.use(protectSwagger);
  const port = process.env.PORT;
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('IC')
    .setDescription('The IC API description')
    .setVersion('0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
}
bootstrap();
