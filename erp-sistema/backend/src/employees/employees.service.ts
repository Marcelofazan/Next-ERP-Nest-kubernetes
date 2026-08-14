import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { User } from '../users/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/utils/paginate';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(pagination: PaginationQueryDto) {
    return paginate(
      this.employeesRepository
        .createQueryBuilder('emp')
        .leftJoinAndSelect('emp.user', 'user')
        .leftJoinAndSelect('user.role', 'role'),
      pagination,
    );
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
      relations: ['user', 'user.role'],
    });
    if (!employee) throw new NotFoundException(`Funcionário #${id} não encontrado`);
    return employee;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user)
      throw new NotFoundException(`Usuário #${dto.userId} não encontrado`);

    const existing = await this.employeesRepository.findOne({
      where: { user: { id: dto.userId } },
    });
    if (existing)
      throw new ConflictException(
        `O usuário #${dto.userId} já possui um registro de funcionário.`,
      );

    const employee = this.employeesRepository.create({
      department: dto.department,
      salary: dto.salary,
      user,
    });
    return this.employeesRepository.save(employee);
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<Employee> {
    await this.findOne(id);
    const updates: Partial<Employee> = {};
    if (dto.department !== undefined) updates.department = dto.department;
    if (dto.salary !== undefined) updates.salary = dto.salary;
    await this.employeesRepository.save({ id, ...updates });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.employeesRepository.delete(id);
  }
}