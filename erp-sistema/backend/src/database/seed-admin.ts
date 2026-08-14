/**
 * Script para criar o primeiro usuário admin.
 * Uso: npm run seed:admin
 * Executar apenas em ambiente de desenvolvimento ou no primeiro deploy.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

async function seedAdmin() {
  const ds = new DataSource(
    process.env.DB_TYPE === 'postgres'
      ? {
          type: 'postgres',
          host: process.env.DB_HOST ?? 'localhost',
          port: parseInt(process.env.DB_PORT ?? '5432'),
          username: process.env.DB_USER ?? 'postgres',
          password: process.env.DB_PASSWORD ?? '',
          database: process.env.DB_NAME ?? 'erp_db',
          entities: [join(__dirname, '../**/*.entity.{ts,js}')],
          synchronize: false,
        }
      : {
          type: 'sqlite',
          database: process.env.DB_PATH ?? 'erp.db',
          entities: [join(__dirname, '../**/*.entity.{ts,js}')],
          synchronize: false,
        },
  );

  await ds.initialize();

  const rolesRepo = ds.getRepository('roles');
  const usersRepo = ds.getRepository('users');

  let adminRole = await rolesRepo.findOne({ where: { name: 'admin' } });
  if (!adminRole) {
    adminRole = await rolesRepo.save(rolesRepo.create({ name: 'admin' }));
    await rolesRepo.save(rolesRepo.create({ name: 'employee' }));
    console.log('✓ Roles criados: admin, employee');
  }

  const email = process.env.ADMIN_EMAIL ?? 'admin@erp.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin12345!';
  const existing = await usersRepo.findOne({ where: { email } });

  if (existing) {
    console.log(`⚠  Usuário ${email} já existe. Nenhuma alteração feita.`);
  } else {
    const password_hash = await bcrypt.hash(password, 12);
    await usersRepo.save(
      usersRepo.create({ email, password_hash, role: adminRole }),
    );
    console.log(`✓ Admin criado: ${email} / ${password}`);
    console.log('  ⚠  Altere a senha no primeiro login.');
  }

  await ds.destroy();
}

seedAdmin().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});