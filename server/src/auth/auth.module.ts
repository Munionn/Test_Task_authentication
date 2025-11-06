import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const accessTokenExpiresIn = configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '24h',
        );
        return {
          secret: configService.get<string>(
            'JWT_SECRET',
            'your-secret-key-change-in-production',
          ),
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiresIn: accessTokenExpiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const refreshTokenExpiresIn = configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        );
        const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
        if (!refreshSecret) {
          throw new Error(
            'JWT_REFRESH_SECRET is not defined in environment variables',
          );
        }
        return {
          secret: refreshSecret,
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiresIn: refreshTokenExpiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
