import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

interface RequestWithCookies {
  cookies?: {
    access_token?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          const req = request as Request & RequestWithCookies;
          const token = req?.cookies?.access_token;
          return typeof token === 'string' ? token : null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const user = (await this.authService.findById(payload.sub)) as {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
    } | null;
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
