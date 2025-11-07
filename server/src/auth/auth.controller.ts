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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthExceptionFilter } from './filters/auth-exception.filter';

@ApiTags('auth')
@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            createdAt: { type: 'string', example: '2025-11-07T12:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in. Cookies are set automatically.',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            createdAt: { type: 'string', example: '2025-11-07T12:00:00.000Z' },
          },
        },
        message: { type: 'string', example: 'Login successful' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad request' })
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
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? ('none' as const) : ('lax' as const),
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        };

        response.cookie('access_token', result.access_token, cookieOptions);

        response.cookie('refresh_token', result.refresh_token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description:
      'Token refreshed successfully. New cookies are set automatically.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token refreshed successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 400, description: 'Bad request' })
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
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? ('none' as const) : ('lax' as const),
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        };

        response.cookie('access_token', result.access_token, cookieOptions);

        response.cookie('refresh_token', result.refresh_token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
  @ApiOperation({ summary: 'Logout user' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out. Cookies are cleared.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Get user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        email: { type: 'string', example: 'user@example.com' },
        name: { type: 'string', example: 'John Doe' },
        createdAt: { type: 'string', example: '2025-11-07T12:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            createdAt: { type: 'string', example: '2025-11-07T12:00:00.000Z' },
          },
        },
        message: { type: 'string', example: 'Profile updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
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
