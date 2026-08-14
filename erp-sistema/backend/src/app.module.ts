import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.local'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3002),
        JWT_SECRET: Joi.string()
          .min(32)
          .default('oCoGb6D/h61CZtttbthij6BtFt15pgeggTphzl6PDtzs5xz2E3daYrucMS9Ag0T4HV4zhbZNj+boFcIV/vXK+Q=='),
        JWT_EXPIRES_IN: Joi.string().default('8h'),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
        ALLOW_PUBLIC_REGISTRATION: Joi.string()
          .valid('true', 'false')
          .default('false'),
        DB_SYNCHRONIZE: Joi.string().valid('true', 'false').default('true'),
        DB_TYPE: Joi.string().valid('postgres', 'sqlite').default('postgres'),
        // ADICIONADO: Validações básicas para evitar strings vazias acidentais no Kubernetes
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().default('postgres'),
        DB_PASSWORD: Joi.string().default('erp_pass'),
        DB_NAME: Joi.string().default('erp_db'),
      }),
      validationOptions: { allowUnknown: true },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        
        const synchronize = isProduction 
          ? config.get<string>('DB_SYNCHRONIZE') === 'true'
          : true;

        if (config.get<string>('DB_TYPE') === 'postgres') {
          return {
            type: 'postgres' as const,
            host: config.get<string>('DB_HOST'),
            port: config.get<number>('DB_PORT'),
            username: config.get<string>('DB_USER'),
            password: config.get<string>('DB_PASSWORD'),
            database: config.get<string>('DB_NAME'),
            autoLoadEntities: true,
            synchronize,
            migrations: ['dist/database/migrations/*.js'],
            migrationsRun: isProduction,
            // CORRIGIDO: Força o TypeORM a tentar reconectar caso o banco demore para subir no Kubernetes
            retryAttempts: 10,
            retryDelay: 3000,
            keepConnectionAlive: true,
          };
        }
        return {
          type: 'sqlite' as const,
          database: config.get<string>('DB_PATH') ?? 'erp.db',
          autoLoadEntities: true,
          synchronize,
          migrations: ['dist/database/migrations/*.js'],
          migrationsRun: isProduction,
        };
      },
    }),
    AuthModule,
    UsersModule,
    EmployeesModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}