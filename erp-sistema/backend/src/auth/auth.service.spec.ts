import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockUser = {
  id: 1,
  email: 'admin@erp.com',
  password_hash: bcrypt.hashSync('secret123', 10),
  role: { id: 1, name: 'admin' },
  created_at: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByEmail: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock.jwt.token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test_secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return access_token on valid credentials', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser as any);
    const result = await service.login('admin@erp.com', 'secret123');
    expect(result.access_token).toBe('mock.jwt.token');
    expect(result.user.email).toBe('admin@erp.com');
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 1,
      email: 'admin@erp.com',
    });
  });

  it('should throw UnauthorizedException when user not found', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(service.login('naoexiste@erp.com', 'pass')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException on wrong password', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser as any);
    await expect(service.login('admin@erp.com', 'wrongpass')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});