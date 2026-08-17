import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { AppConfig } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Authentification JWT (5 rôles — voir `@c3-digital/shared` `UserRole`).
 * Exporte `JwtModule`/`PassportModule`/`RolesGuard` pour que les autres
 * modules puissent protéger leurs routes avec
 * `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
 */
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const auth = configService.get('auth', { infer: true });
        return {
          secret: auth.jwtSecret,
          // `expiresIn` typé `StringValue` (motif template-literal du
          // package `ms`) côté @nestjs/jwt : notre valeur vient d'une
          // variable d'environnement (`string` générique), validée au
          // runtime par la librairie plutôt qu'à la compilation.
          signOptions: { expiresIn: auth.jwtExpiresIn as never },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, RolesGuard, JwtModule, PassportModule],
})
export class AuthModule {}
