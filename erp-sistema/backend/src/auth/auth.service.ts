import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async register(email: string, password: string) {
    const user = await this.usersService.create({ email, password });
    const payload = { sub: user.id, email: user.email };
    this.logger.log(`User registered: ${email}`);
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Failed login attempt for unknown email: ${email}`);
      throw new UnauthorizedException('Credenciais incorretas');
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      this.logger.warn(`Failed login attempt (wrong password) for: ${email}`);
      throw new UnauthorizedException('Credenciais incorretas');
    }

    const payload = { sub: user.id, email: user.email };
    this.logger.log(`User logged in: ${email}`);
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
