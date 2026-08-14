import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterGuard } from './register.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  // CORREÇÃO 1: false se não for produção para permitir HTTP comum no Docker local
  secure: process.env.NODE_ENV === 'production',
  // CORREÇÃO 2: alterado para 'lax' para permitir envio de cookies entre portas diferentes (:3000 -> :3002)
  sameSite: 'lax' as const,
  path: '/',
  // CORREÇÃO 3: Multiplicado por 1000. Express espera milissegundos (8h = 28.800.000 ms)
  maxAge: 8 * 60 * 60 * 1000, 
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Response({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.login(body.email, body.password);
    res.cookie('access_token', result.access_token, COOKIE_OPTIONS);
    return { user: result.user };
  }

  @UseGuards(RegisterGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Response({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.register(body.email, body.password);
    res.cookie('access_token', result.access_token, COOKIE_OPTIONS);
    return { user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Response({ passthrough: true }) res: any) {
    res.clearCookie('access_token', { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return { message: 'Sessão encerrada' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: any) {
    const { id, email, role, created_at } = req.user;
    return { id, email, role, created_at };
  }
}