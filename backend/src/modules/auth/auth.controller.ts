import type { AuthUser, LoginResponse } from '@c3-digital/shared';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserEntity } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  /** Profil de l'utilisateur authentifié — utilisé par le web pour restaurer la session. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: UserEntity): AuthUser {
    return this.authService.toAuthUser(user);
  }
}
