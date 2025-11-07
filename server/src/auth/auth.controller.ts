/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Put,
  Request,
  UseFilters,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthExceptionFilter } from './filters/auth-exception.filter';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      if (!loginDto || !loginDto.email || !loginDto.password) {
        throw new BadRequestException('Email and password are required');
      }

      const result = await this.authService.login(loginDto);

      try {
        response.cookie('access_token', result.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        });

        response.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });
      } catch {
        throw new BadRequestException('Failed to set authentication cookies');
      }

      return {
        user: result.user,
        message: 'Login successful',
      };
    } catch (error) {
      try {
        response.clearCookie('access_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        response.clearCookie('refresh_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      } catch {
        throw new BadRequestException('Failed to clear cookies');
      }
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      if (!refreshTokenDto || !refreshTokenDto.refresh_token) {
        throw new BadRequestException('Refresh token is required');
      }

      const result = await this.authService.refreshAccessToken(
        refreshTokenDto.refresh_token,
      );

      try {
        response.cookie('access_token', result.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        });

        response.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });
      } catch {
        throw new BadRequestException('Failed to set authentication cookies');
      }

      return {
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      try {
        response.clearCookie('access_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        response.clearCookie('refresh_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      } catch {
        // Ignore cookie clearing errors
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: { user: { id: string } },
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      if (!req.user || !req.user.id) {
        throw new BadRequestException('User information is missing');
      }

      await this.authService.revokeRefreshToken(req.user.id);

      try {
        response.clearCookie('access_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });

        response.clearCookie('refresh_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      } catch {
        throw new BadRequestException('Failed to clear cookies');
      }

      return { message: 'Logout successful' };
    } catch (error) {
      try {
        response.clearCookie('access_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        response.clearCookie('refresh_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      } catch {
        // Ignore
      }
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(
    @Request() req: { user: { id: string; email: string; name: string } },
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User information is missing');
    }

    return req.user;
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: { user: { id: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User information is missing');
    }

    if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    const updatedUser = await this.authService.updateUser(
      req.user.id,
      updateUserDto,
    );
    return {
      user: updatedUser,
      message: 'Profile updated successfully',
    };
  }
}
