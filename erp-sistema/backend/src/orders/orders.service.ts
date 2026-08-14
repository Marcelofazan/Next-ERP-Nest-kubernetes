import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderItem } from './order.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/utils/paginate';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(pagination: PaginationQueryDto) {
    return paginate(
      this.ordersRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.customer', 'customer')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .orderBy('order.created_at', 'DESC'),
      pagination,
    );
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['customer', 'items', 'items.product'],
    });
    if (!order) throw new NotFoundException(`Pedido #${id} não encontrado`);
    return order;
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    if (!dto.items?.length)
      throw new BadRequestException('O pedido deve ter pelo menos um item');

    const customer = await this.usersRepository.findOne({
      where: { id: dto.customerId },
    });
    if (!customer)
      throw new NotFoundException(`Cliente #${dto.customerId} não encontrado`);

    // Carregar todos os produtos em UMA única query (evita N+1)
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productsRepository.find({
      where: { id: In(productIds) },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Verificar se todos existem e calcular o total com aritmética inteira (evita float)
    let totalCents = 0;
    const resolvedItems: {
      product: Product;
      quantity: number;
      unitPriceCents: number;
    }[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product)
        throw new NotFoundException(
          `Produto #${item.productId} não encontrado`,
        );
      const unitPriceCents = Math.round(Number(product.price) * 100);
      resolvedItems.push({ product, quantity: item.quantity, unitPriceCents });
      totalCents += unitPriceCents * item.quantity;
    }

    const total = totalCents / 100;

    const order = this.ordersRepository.create({
      status: dto.status,
      total,
      customer,
    });
    const savedOrder = await this.ordersRepository.save(order);

    const items = resolvedItems.map(({ product, quantity, unitPriceCents }) =>
      this.orderItemsRepository.create({
        quantity,
        product,
        order: savedOrder,
        unit_price: unitPriceCents / 100,
      }),
    );
    await this.orderItemsRepository.save(items);

    return this.findOne(savedOrder.id);
  }

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    await this.findOne(id);
    if (dto.status)
      await this.ordersRepository.update(id, { status: dto.status });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.orderItemsRepository.delete({ order: { id } });
    await this.ordersRepository.delete(id);
  }
}