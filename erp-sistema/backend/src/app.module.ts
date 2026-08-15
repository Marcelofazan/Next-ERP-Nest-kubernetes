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
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3002),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('8h'),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
        ALLOW_PUBLIC_REGISTRATION: Joi.string()
          .valid('true', 'false')
          .default('false'),
        DB_TYPE: Joi.string().valid('postgres', 'sqlite').default('sqlite'), // CORRIGIDO: Permite validar o tipo de banco
        DB_SYNCHRONIZE: Joi.string().valid('true', 'false').default('false'),
      }),
      validationOptions: { allowUnknown: true },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        
        // Se for Postgres, respeita as variáveis de ambiente
        if (config.get<string>('DB_TYPE') === 'postgres') {
          const synchronize = !isProduction && config.get<string>('DB_SYNCHRONIZE') === 'true';
          return {
            type: 'postgres' as const,
            host: config.get<string>('DB_HOST') ?? 'localhost',
            port: parseInt(config.get<string>('DB_PORT') ?? '5432'),
            username: config.get<string>('DB_USER') ?? 'erp_user',
            password: config.get<string>('DB_PASSWORD') ?? 'erp_pass',
            database: config.get<string>('DB_NAME') ?? 'erp_db',
            autoLoadEntities: true,
            synchronize,
            migrations: ['dist/database/migrations/*.js'],
            migrationsRun: isProduction,
          };
        }

        // CORREÇÃO DEFINITIVA PARA SQLITE:
        // Força synchronize=true no desenvolvimento local para criar as tabelas estruturais automaticamente
        return {
          type: 'sqlite' as const,
          database: config.get<string>('DB_PATH') ?? 'erp.db',
          autoLoadEntities: true,
          synchronize: !isProduction ? true : false, 
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
