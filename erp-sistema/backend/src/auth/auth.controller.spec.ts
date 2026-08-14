import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterGuard } from './register.guard';

const mockAuthService = { login: jest.fn() };
const allowAll = { canActivate: () => true };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(allowAll)
      .overrideGuard(RegisterGuard).useValue(allowAll)
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve retornar o token ao fazer login com sucesso', async () => {
    const expected = {
      access_token: 'jwt.token',
      user: { id: 1, email: 'admin@erp.com' },
    };
    mockAuthService.login.mockResolvedValue(expected);
    const mockRes = { cookie: jest.fn() };

    const result = await controller.login(
      { email: 'admin@erp.com', password: 'secret123' },
      mockRes,
    );

    expect(result).toEqual({ user: expected.user });
    expect(mockAuthService.login).toHaveBeenCalledWith(
      'admin@erp.com',
      'secret123',
    );
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'access_token',
      expected.access_token,
      expect.any(Object),
    );
  });

  it('deve propagar UnauthorizedException lançada pelo serviço', async () => {
    mockAuthService.login.mockRejectedValue(
      new UnauthorizedException('Credenciais inválidas'),
    );
    const mockRes = { cookie: jest.fn() };

    await expect(
      controller.login({ email: 'x@x.com', password: '123456' }, mockRes),
    ).rejects.toThrow(UnauthorizedException);
  });
});