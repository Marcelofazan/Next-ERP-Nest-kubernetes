import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Employee } from './employee.entity';
import { User } from '../users/user.entity';

const mockUser = { id: 1, email: 'user@test.com' } as User;
const mockEmployee = {
  id: 1,
  department: 'Vendas',
  salary: 3000,
  user: mockUser,
} as Employee;

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

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeesRepo: ReturnType<typeof makeRepo>;
  let usersRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    employeesRepo = makeRepo(mockEmployee);
    usersRepo = makeRepo(mockUser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useValue: employeesRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('lança NotFoundException se o userId não existir', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    await expect(
      service.create({ userId: 999, department: 'TI', salary: 4000 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lança ConflictException se o userId já tiver um funcionário associado', async () => {
    // usersRepo retorna o usuário
    // employeesRepo retorna o funcionário existente na verificação de duplicidade
    employeesRepo.findOne.mockResolvedValueOnce(mockEmployee);
    await expect(
      service.create({ userId: 1, department: 'TI', salary: 4000 }),
    ).rejects.toThrow(ConflictException);
  });

  it('cria o funcionário quando não houver duplicidade', async () => {
    employeesRepo.findOne.mockResolvedValueOnce(null); // não duplicado
    const result = await service.create({
      userId: 1,
      department: 'TI',
      salary: 4000,
    });
    expect(employeesRepo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('lança NotFoundException ao buscar um funcionário inexistente', async () => {
    employeesRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});