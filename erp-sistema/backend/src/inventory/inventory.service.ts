import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './inventory.entity';
import { Product } from '../products/product.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/utils/paginate';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  findAll(pagination: PaginationQueryDto) {
    return paginate(
      this.inventoryRepository
        .createQueryBuilder('inv')
        .leftJoinAndSelect('inv.product', 'product'),
      pagination,
    );
  }

  async findOne(id: number): Promise<Inventory> {
    const item = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!item) throw new NotFoundException(`Inventário #${id} não encontrado`);
    return item;
  }

  async create(dto: CreateInventoryDto): Promise<Inventory> {
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product)
      throw new NotFoundException(`Produto #${dto.productId} não encontrado`);

    const existing = await this.inventoryRepository.findOne({
      where: { product: { id: dto.productId }, warehouse_id: dto.warehouse_id },
    });
    if (existing)
      throw new ConflictException(
        `Já existe inventário para o produto #${dto.productId} no armazém #${dto.warehouse_id}. Use PUT /inventory/${existing.id} para atualizar.`,
      );

    const item = this.inventoryRepository.create({
      warehouse_id: dto.warehouse_id,
      quantity: dto.quantity,
      product,
    });
    return this.inventoryRepository.save(item);
  }

  async update(id: number, dto: UpdateInventoryDto): Promise<Inventory> {
    await this.findOne(id);
    const updates: Partial<Inventory> = {};
    if (dto.quantity !== undefined) updates.quantity = dto.quantity;
    if (dto.warehouse_id !== undefined) updates.warehouse_id = dto.warehouse_id;
    await this.inventoryRepository.save({ id, ...updates });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.inventoryRepository.delete(id);
  }
}