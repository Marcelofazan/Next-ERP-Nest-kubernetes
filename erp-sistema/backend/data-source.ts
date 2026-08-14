import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const isPostgres = process.env.DB_TYPE === 'postgres';

const options: DataSourceOptions = isPostgres
  ? {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'erp_db',
      entities: [join(__dirname, 'src/**/*.entity.{ts,js}')],
      migrations: [join(__dirname, 'src/database/migrations/*.{ts,js}')],
      synchronize: false,
    }
  : {
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'erp.db',
      entities: [join(__dirname, 'src/**/*.entity.{ts,js}')],
      migrations: [join(__dirname, 'src/database/migrations/*.{ts,js}')],
      synchronize: false,
    };

export default new DataSource(options);
