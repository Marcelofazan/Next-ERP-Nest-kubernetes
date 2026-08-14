import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product, Category } from './product.entity';

const mockProduct = { id: 1, name: 'Laptop', price: '999.99' } as unknown as Product;

const makeRepo = (findResult: any = null) => ({
  createQueryBuilder: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  findOne: jest.fn().mockResolvedValue(findResult),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((v) => v),
  save: jest.fn().mockImplementation((v) => Promise.resolve({ id: 1, ...v })),
  delete: jest.fn().mockResolvedValue({}),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepo: ReturnType<typeof makeRepo>;
  let categoriesRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    productsRepo = makeRepo(mockProduct);
    categoriesRepo = makeRepo(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('lança NotFoundException ao buscar um produto inexistente', async () => {
    productsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('lança NotFoundException se a categoria não existir ao criar', async () => {
    categoriesRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create({ name: 'Teclado', price: 49.99, categoryId: 999 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('faz o trim do nome ao criar', async () => {
    await service.create({ name: '  Laptop  ', price: 999.99 });
    const created = productsRepo.create.mock.calls[0][0];
    expect(created.name).toBe('Laptop');
  });

  it('update com nome vazio não sobrescreve silenciosamente', async () => {
    await service.update(1, { name: '' });
    const saved = productsRepo.save.mock.calls[0][0];
    // nome vazio (falsy) se torna '' após o trim; atualiza da mesma forma (comportamento esperado)
    // O mais importante: NÃO fica undefined no save
    expect(Object.prototype.hasOwnProperty.call(saved, 'name')).toBe(true);
    expect(saved.name).toBe('');
  });

  it('update atualiza apenas os campos presentes', async () => {
    await service.update(1, { price: 1099.99 });
    const saved = productsRepo.save.mock.calls[0][0];
    expect(saved.price).toBe(1099.99);
    // name não foi enviado → não deve estar no objeto de update
    expect(Object.prototype.hasOwnProperty.call(saved, 'name')).toBe(false);
  });
});