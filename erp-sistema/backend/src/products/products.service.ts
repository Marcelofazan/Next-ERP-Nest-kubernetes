import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, Category } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/utils/paginate';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  findAll(pagination: PaginationQueryDto) {
    return paginate(
      this.productsRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category'),
      pagination,
    );
  }

  findAllCategories(): Promise<Category[]> {
    return this.categoriesRepository.find();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException(`Produto #${id} não encontrado`);
    return product;
  }

  private async resolveCategory(
    categoryId?: number,
  ): Promise<Category | undefined> {
    if (!categoryId) return undefined;
    const cat = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });
    if (!cat)
      throw new NotFoundException(`Categoria #${categoryId} não encontrada`);
    return cat;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.resolveCategory(dto.categoryId);
    const product = this.productsRepository.create({
      name: dto.name.trim(),
      price: dto.price,
      ...(category ? { category } : {}),
    });
    return this.productsRepository.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    const category = await this.resolveCategory(dto.categoryId);
    const updates: Partial<Product> & { category?: Category } = {};
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.price !== undefined) updates.price = dto.price;
    if (category) updates.category = category;
    await this.productsRepository.save({ id, ...updates });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.productsRepository.delete(id);
  }
}