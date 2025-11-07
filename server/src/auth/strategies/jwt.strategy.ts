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

  async validate(
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; name: string; createdAt: Date }> {
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Invalid token payload format');
    }

    let user: {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
    } | null;
    try {
      user = (await this.authService.findById(payload.sub)) as {
        id: string;
        email: string;
        name: string;
        createdAt: Date;
      } | null;
    } catch {
      throw new UnauthorizedException('Failed to validate user');
    }

    if (!user) {
      throw new UnauthorizedException('User not found or has been deleted');
    }

    if (user.email !== payload.email) {
      throw new UnauthorizedException('Token email mismatch');
    }

    return user;
  }
}
