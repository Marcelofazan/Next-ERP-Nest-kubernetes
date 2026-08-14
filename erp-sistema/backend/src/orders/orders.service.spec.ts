import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderItem } from './order.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

const mockProduct = (id: number, price: string) =>
  ({ id, name: `Product ${id}`, price }) as unknown as Product;
const mockUser = (id: number) => ({ id, email: `u${id}@test.com` }) as unknown as User;

const makeRepo = (findResult: any = null) => ({
  createQueryBuilder: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockResolvedValue(findResult),
  find: jest.fn().mockResolvedValue([findResult].filter(Boolean)),
  create: jest.fn().mockImplementation((v) => v),
  save: jest.fn().mockImplementation((v) => Promise.resolve({ id: 99, ...v })),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: ReturnType<typeof makeRepo>;
  let itemsRepo: ReturnType<typeof makeRepo>;
  let productsRepo: ReturnType<typeof makeRepo>;
  let usersRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    ordersRepo = makeRepo({
      id: 1,
      status: 'pending',
      total: '10400.00',
      customer: mockUser(1),
      items: [],
    });
    itemsRepo = makeRepo();
    productsRepo = makeRepo();
    usersRepo = makeRepo(mockUser(1));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: getRepositoryToken(OrderItem), useValue: itemsRepo },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // ── Validações ─────────────────────────────────────────────────
  it('lança BadRequestException se items estiver vazio', async () => {
    await expect(
      service.create({ customerId: 1, status: 'pending', items: [] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lança NotFoundException se customerId não existir', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create({
        customerId: 99,
        status: 'pending',
        items: [{ productId: 1, quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lança NotFoundException se um productId não existir', async () => {
    productsRepo.find.mockResolvedValue([]); // nenhum produto encontrado
    await expect(
      service.create({
        customerId: 1,
        status: 'pending',
        items: [{ productId: 999, quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // ── Aritmética monetária exata ─────────────────────────────────
  it('calcula o total exato com 99.99 × 3 = 299.97', async () => {
    productsRepo.find.mockResolvedValue([mockProduct(1, '99.99')]);
    ordersRepo.save.mockResolvedValue({
      id: 1,
      total: 299.97,
      status: 'pending',
      customer: mockUser(1),
    });
    ordersRepo.findOne.mockResolvedValue({
      id: 1,
      total: '299.97',
      status: 'pending',
      customer: mockUser(1),
      items: [
        {
          id: 1,
          quantity: 3,
          unit_price: '99.99',
          product: mockProduct(1, '99.99'),
        },
      ],
    });

    const order = await service.create({
      customerId: 1,
      status: 'pending',
      items: [{ productId: 1, quantity: 3 }],
    });

    // O save foi chamado com o total exato
    const savedCall = ordersRepo.save.mock.calls[0][0];
    expect(savedCall.total).toBe(299.97);

    // Verificar que NÃO é o resultado de float puro (299.97000000000003)
    expect(String(savedCall.total)).toBe('299.97');
    expect(Number(order.total)).toBe(299.97);
  });

  it('calcula o total exato com 5200 × 2 = 10400', async () => {
    productsRepo.find.mockResolvedValue([mockProduct(1, '5200.00')]);
    ordersRepo.save.mockResolvedValue({
      id: 1,
      total: 10400,
      status: 'pending',
      customer: mockUser(1),
    });
    ordersRepo.findOne.mockResolvedValue({
      id: 1,
      total: '10400.00',
      status: 'pending',
      customer: mockUser(1),
      items: [
        {
          id: 1,
          quantity: 2,
          unit_price: '5200.00',
          product: mockProduct(1, '5200.00'),
        },
      ],
    });

    await service.create({
      customerId: 1,
      status: 'pending',
      items: [{ productId: 1, quantity: 2 }],
    });

    const savedCall = ordersRepo.save.mock.calls[0][0];
    expect(savedCall.total).toBe(10400);
  });

  it('salva o unit_price no item (preço histórico)', async () => {
    productsRepo.find.mockResolvedValue([mockProduct(1, '49.99')]);
    ordersRepo.save.mockResolvedValue({
      id: 1,
      total: 49.99,
      status: 'pending',
      customer: mockUser(1),
    });
    ordersRepo.findOne.mockResolvedValue({
      id: 1,
      total: '49.99',
      status: 'pending',
      customer: mockUser(1),
      items: [
        {
          id: 1,
          quantity: 1,
          unit_price: '49.99',
          product: mockProduct(1, '49.99'),
        },
      ],
    });

    await service.create({
      customerId: 1,
      status: 'pending',
      items: [{ productId: 1, quantity: 1 }],
    });

    const itemSaved = itemsRepo.save.mock.calls[0][0][0];
    expect(Number(itemSaved.unit_price)).toBe(49.99);
  });

  // ── Problema N+1 eliminado ─────────────────────────────────────
  it('carrega todos os produtos em uma única query (sem N+1)', async () => {
    productsRepo.find.mockResolvedValue([
      mockProduct(1, '10.00'),
      mockProduct(2, '20.00'),
    ]);
    ordersRepo.save.mockResolvedValue({
      id: 1,
      total: 30,
      status: 'pending',
      customer: mockUser(1),
    });
    ordersRepo.findOne.mockResolvedValue({
      id: 1,
      total: '30.00',
      status: 'pending',
      customer: mockUser(1),
      items: [],
    });

    await service.create({
      customerId: 1,
      status: 'pending',
      items: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
      ],
    });

    // productsRepo.find é chamado exatamente 1 vez (não 2)
    expect(productsRepo.find).toHaveBeenCalledTimes(1);
    expect(productsRepo.findOne).not.toHaveBeenCalled();
  });
});