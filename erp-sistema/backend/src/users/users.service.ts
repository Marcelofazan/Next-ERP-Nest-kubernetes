import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, Role } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/utils/paginate';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findAll(pagination: PaginationQueryDto) {
    return paginate(
      this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role'),
      pagination,
    );
  }

  findAllRoles(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`Usuário #${id} não encontrado`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('O e-mail já está registrado');

    if (dto.roleId) {
      const role = await this.rolesRepository.findOne({
        where: { id: dto.roleId },
      });
      if (!role)
        throw new NotFoundException(`Cargo #${dto.roleId} não encontrado`);
    }

    const password_hash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({
      email: dto.email,
      password_hash,
      ...(dto.roleId ? { role: { id: dto.roleId } as Role } : {}),
    });
    return this.usersRepository.save(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);

    if (dto.roleId) {
      const role = await this.rolesRepository.findOne({
        where: { id: dto.roleId },
      });
      if (!role)
        throw new NotFoundException(`Cargo #${dto.roleId} não encontrado`);
    }

    const updates: Record<string, unknown> = {};
    if (dto.email) updates['email'] = dto.email;
    if (dto.password)
      updates['password_hash'] = await bcrypt.hash(dto.password, 12);
    if (dto.roleId) updates['role'] = { id: dto.roleId };
    await this.usersRepository.save({ id, ...updates });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.usersRepository.delete(id);
  }
}