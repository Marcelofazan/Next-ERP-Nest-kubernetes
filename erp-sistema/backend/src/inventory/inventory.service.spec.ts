import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory } from './inventory.entity';
import { Product } from '../products/product.entity';

const mockProduct = { id: 1, name: 'Laptop', price: '999.99' } as unknown as Product;
const mockInventory = {
  id: 1,
  warehouse_id: 1,
  quantity: 10,
  product: mockProduct,
} as Inventory;

const makeRepo = (findResult: any = null) => ({
  createQueryBuilder: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  findOne: jest.fn().mockResolvedValue(findResult),
  create: jest.fn().mockImplementation((v) => v),
  save: jest.fn().mockImplementation((v) => Promise.resolve({ id: 1, ...v })),
  delete: jest.fn().mockResolvedValue({}),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: ReturnType<typeof makeRepo>;
  let productsRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    inventoryRepo = makeRepo(mockInventory);
    productsRepo = makeRepo(mockProduct);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Inventory), useValue: inventoryRepo },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('lança NotFoundException se o produto não existir', async () => {
    productsRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create({ productId: 999, warehouse_id: 1, quantity: 5 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lança ConflictException se já existir inventário para o produto + galpão', async () => {
    // productsRepo retorna o produto (existe)
    // inventoryRepo retorna um registro existente (duplicado)
    inventoryRepo.findOne.mockResolvedValueOnce(mockInventory); // findOne para checagem de duplicado
    await expect(
      service.create({ productId: 1, warehouse_id: 1, quantity: 5 }),
    ).rejects.toThrow(ConflictException);
  });

  it('cria o inventário corretamente quando não houver duplicidade', async () => {
    inventoryRepo.findOne.mockResolvedValueOnce(null); // não duplicado
    const result = await service.create({
      productId: 1,
      warehouse_id: 2,
      quantity: 15,
    });
    expect(inventoryRepo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('lança NotFoundException ao buscar inventário inexistente', async () => {
    inventoryRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});
