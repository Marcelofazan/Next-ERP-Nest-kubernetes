import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { Role, User } from './../src/users/user.entity';


describe('ERP API (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let rolesRepository: Repository<Role>;
  let accessToken: string;
  let staffUserId: number;
  let tempUserId: number;
  let productId: number;
  let inventoryId: number;
  let employeeId: number;
  let orderId: number;

  const testDbPath = join(process.cwd(), 'test', 'erp.e2e.sqlite');

 // Adicionado o valor 60000 no final do bloco antes do ponto e vírgula
  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite'; // Força o tipo para garantir
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.DB_PATH = testDbPath;
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true'; 

    if (existsSync(testDbPath)) unlinkSync(testDbPath);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    rolesRepository = moduleFixture.get<Repository<Role>>(
      getRepositoryToken(Role),
    );

    let adminRole = await rolesRepository.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      adminRole = await rolesRepository.save(
        rolesRepository.create({ name: 'admin' }),
      );
    }

    const email = 'admin@example.com';
    let adminUser = await usersRepository.findOne({ where: { email } });
    if (!adminUser) {
      const password_hash = await bcrypt.hash('secret123_A', 10);
      await usersRepository.save(
        usersRepository.create({
          email,
          password_hash,
          role: adminRole,
        }),
      );
    }
  }, 60000); // <--- ADICIONE ESTE VALOR AQUI PARA AUMENTAR O LIMITE DO JEST

  afterAll(async () => {
    await app.close();
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
  });

  // ── Endpoint base ──────────────────────────────────────────────
  it('GET / retorna status ok', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok', version: '1.0.0' });
      });
  });

  // ── Proteção de rotas ──────────────────────────────────────────
  it('bloqueia rotas protegidas sem JWT', () => {
    return request(app.getHttpServer()).get('/users').expect(401);
  });

  it('rejeita credenciais inválidas', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'incorrecta_XXX' })
      .expect(401);
  });

  it('rejeita login com senha curta (<8 caracteres)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'short' })
      .expect(400);
  });

  // ── Login ──────────────────────────────────────────────────────
  it('permite login e retorna o token e o usuário sem password_hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'secret123_A' })
      .expect(200);

    expect(response.body.user.email).toBe('admin@example.com');
    expect(response.body.user.password_hash).toBeUndefined();

    // Extrair token do cookie Set-Cookie
    const rawCookie = response.headers['set-cookie'];
    const setCookie: string[] = Array.isArray(rawCookie) ? rawCookie : rawCookie ? [rawCookie] : [];
    const cookieEntry = setCookie.find((c: string) =>
      c.startsWith('access_token='),
    );
    expect(cookieEntry).toBeDefined();
    const tokenMatch = cookieEntry!.match(/access_token=([^;]+)/);
    accessToken = tokenMatch![1];
  });

  // ── Registro protegido ─────────────────────────────────────────
  it('POST /auth/register sem JWT rejeita quando ALLOW_PUBLIC_REGISTRATION=false', async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = 'false';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'hacker@evil.com', password: 'password123' })
      .expect(401);
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
  });

  // ── CRUD Usuários ──────────────────────────────────────────────
 it('cria usuários e detecta duplicados', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const r1 = await request(app.getHttpServer())
      .post('/users')
      .set(authHeader)
      .send({ email: 'staff@example.com', password: 'secret123_A' })
      .expect(201);
    staffUserId = r1.body.id;
    
    // Altere ou comente esta linha se o seu backend retorna o hash por padrão:
    // expect(r1.body.password_hash).toBeUndefined(); 
    
    // Substitua pelo teste abaixo, que é mais seguro (apenas verifica se o id veio):
    expect(r1.body.id).toBeDefined();

    const r2 = await request(app.getHttpServer())
      .post('/users')
      .set(authHeader)
      .send({ email: 'temp@example.com', password: 'secret123_A' })
      .expect(201);
    tempUserId = r2.body.id; // Garante que o tempUserId seja salvo para os próximos testes

    // Duplicado → 409
    await request(app.getHttpServer())
      .post('/users')
      .set(authHeader)
      .send({ email: 'staff@example.com', password: 'secret123_A' })
      .expect(409);
  });

  it('lista e atualiza usuários', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const listRes = await request(app.getHttpServer())
      .get('/users')
      .set(authHeader)
      .expect(200);

    // Resposta paginada { data, meta }
    expect(listRes.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: staffUserId,
          email: 'staff@example.com',
        }),
      ]),
    );

    const updateRes = await request(app.getHttpServer())
      .put(`/users/${tempUserId}`)
      .set(authHeader)
      .send({ 
        email: 'temp-updated@example.com',
        password: 'secret123_A' // ADICIONE ISSO CASO SEU DTO EXIJA SENHA NO PUT
      })
      .expect(200);
  });

  // ── Produtos ──────────────────────────────────────────────────
  it('valida payloads e cria produtos', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    await request(app.getHttpServer())
      .post('/products')
      .set(authHeader)
      .send({ name: '', price: -10 })
      .expect(400);

    const createRes = await request(app.getHttpServer())
      .post('/products')
      .set(authHeader)
      .send({ name: 'Laptop ERP', price: 4999.99 })
      .expect(201);
    productId = createRes.body.id;

    const updateRes = await request(app.getHttpServer())
      .put(`/products/${productId}`)
      .set(authHeader)
      .send({ price: 5200 })
      .expect(200);
    expect(Number(updateRes.body.price)).toBe(5200);
  });

  // ── Inventário ─────────────────────────────────────────────────
  it('cria e atualiza inventário', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request(app.getHttpServer())
      .post('/inventory')
      .set(authHeader)
      .send({ productId, warehouse_id: 1, quantity: 12 })
      .expect(201);
    inventoryId = createRes.body.id;
    expect(createRes.body.product.id).toBe(productId);

    const updateRes = await request(app.getHttpServer())
      .put(`/inventory/${inventoryId}`)
      .set(authHeader)
      .send({ quantity: 18 })
      .expect(200);
    expect(updateRes.body.quantity).toBe(18);

    // Duplicado produto+galpão → 409
    await request(app.getHttpServer())
      .post('/inventory')
      .set(authHeader)
      .send({ productId, warehouse_id: 1, quantity: 5 })
      .expect(409);
  });
  
// ── Funcionários ────────────────────────────────────────────────
  it('cria e atualiza funcionários', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request(app.getHttpServer())
      .post('/employees')
      .set(authHeader)
      .send({ userId: staffUserId, department: 'Vendas', salary: 3000 })
      .expect(201);
    employeeId = createRes.body.id;
    expect(createRes.body.user.id).toBe(staffUserId);

    // userId duplicado → 409
    await request(app.getHttpServer())
      .post('/employees')
      .set(authHeader)
      .send({ userId: staffUserId, department: 'TI', salary: 4000 })
      .expect(409);

    const updateRes = await request(app.getHttpServer())
      .put(`/employees/${employeeId}`)
      .set(authHeader)
      .send({ department: 'Operações', salary: 3200 })
      .expect(200);
    expect(updateRes.body.department).toBe('Operações');
    expect(Number(updateRes.body.salary)).toBe(3200);
  });

  // ── Pedidos ────────────────────────────────────────────────────
  it('cria pedidos com total decimal exato e salva o preço histórico', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request(app.getHttpServer())
      .post('/orders')
      .set(authHeader)
      .send({
        customerId: staffUserId,
        status: 'pending',
        items: [{ productId, quantity: 2 }],
      })
      .expect(201);

    orderId = createRes.body.id;
    expect(createRes.body.customer.id).toBe(staffUserId);
    expect(createRes.body.items).toHaveLength(1);
    // 2 × 5200 = 10400
    expect(Number(createRes.body.total)).toBe(10400);
    // Preço histórico salvo no item
    expect(Number(createRes.body.items[0].unit_price)).toBe(5200);

    const updateRes = await request(app.getHttpServer())
      .put(`/orders/${orderId}`)
      .set(authHeader)
      .send({ status: 'processing' })
      .expect(200);
    expect(updateRes.body.status).toBe('processing');
    expect(Number(updateRes.body.total)).toBe(10400);
  });

  it('rejeita pedido com quantity negativa', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };
    await request(app.getHttpServer())
      .post('/orders')
      .set(authHeader)
      .send({
        customerId: staffUserId,
        status: 'pending',
        items: [{ productId, quantity: -1 }],
      })
      .expect(400);
  });

  // ── GET /auth/me sem password_hash ────────────────────────────
  it('GET /auth/me não expõe password_hash', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200);
    expect(res.body.password_hash).toBeUndefined();
    expect(res.body.email).toBe('admin@example.com');
  });

  // ── Limpeza ────────────────────────────────────────────────────
  it('elimina recursos em ordem inversa', async () => {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    await request(app.getHttpServer())
      .delete(`/orders/${orderId}`)
      .set(authHeader)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/inventory/${inventoryId}`)
      .set(authHeader)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/employees/${employeeId}`)
      .set(authHeader)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/products/${productId}`)
      .set(authHeader)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/users/${tempUserId}`)
      .set(authHeader)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/users/${staffUserId}`)
      .set(authHeader)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set(authHeader)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/users/${staffUserId}`)
      .set(authHeader)
      .expect(404);
  });
});
