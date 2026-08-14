import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

/**
 * Se ALLOW_PUBLIC_REGISTRATION=true → permite sem JWT (apenas para criar o primeiro admin).
 * Em qualquer outro caso exige JWT válido com role.name === 'admin'.
 */
@Injectable()
export class RegisterGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowPublic =
      this.configService.get<string>('ALLOW_PUBLIC_REGISTRATION') === 'true';
    if (allowPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Autenticação necessária');

    let payload: { sub: number; email: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const user = await this.usersService.findOne(payload.sub).catch(() => null);
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    if (user.role?.name !== 'admin')
      throw new ForbiddenException(
        'Apenas administradores podem registrar usuários',
      );

    return true;
  }

  private extractToken(request: any): string | null {
    // Cookie HttpOnly
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) return cookieToken;
    // Authorization: Bearer <token>
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}