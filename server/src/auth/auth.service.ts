/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AuthService {
  private refreshJwtService: JwtService;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Create separate JWT service for refresh tokens
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined in environment variables',
      );
    }
    const refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    this.refreshJwtService = new JwtService({
      secret: refreshSecret,
      signOptions: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresIn: refreshTokenExpiresIn as any,
      },
    });
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Omit<User, 'password'> }> {
    try {
      const { email, password, name } = registerDto;

      // Validate input
      if (!email || !password || !name) {
        throw new BadRequestException('Email, password, and name are required');
      }

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail || normalizedEmail.length < 3) {
        throw new BadRequestException('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new BadRequestException(
          'Password must be at least 8 characters long',
        );
      }

      // Hash password
      let hashedPassword: string;
      try {
        hashedPassword = await bcrypt.hash(password, 10);
      } catch (error) {
        throw new InternalServerErrorException('Failed to hash password');
      }

      // Create user
      const user = this.userRepository.create({
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
      });

      let savedUser: User;
      try {
        savedUser = await this.userRepository.save(user);
      } catch (error) {
        if (error instanceof Error && error.message.includes('unique')) {
          throw new ConflictException('User with this email already exists');
        }
        throw new InternalServerErrorException('Failed to create user');
      }

      // Remove password from response
       
      const { password: __, ...userWithoutPassword } = savedUser;
      return { user: userWithoutPassword };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Registration failed');
    }
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    try {
      // Validate input
      if (!email || !password) {
        return null;
      }

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Find user
      let user: User | null;
      try {
        user = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });
      } catch (error) {
        throw new InternalServerErrorException(
          'Database error during validation',
          error,
        );
      }

      if (!user) {
        // Always perform bcrypt comparison to prevent timing attacks
        await bcrypt.compare(password, '$2b$10$dummyhashforsecurity');
        return null;
      }

      // Validate password
      let isPasswordValid: boolean;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (error) {
        throw new InternalServerErrorException('Password validation failed');
      }

      if (!isPasswordValid) {
        return null;
      }

       
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      return null;
    }
  }

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    user: Omit<User, 'password' | 'refreshToken'>;
  }> {
    try {
      const { email, password } = loginDto;

      // Validate input
      if (!email || !password) {
        throw new BadRequestException('Email and password are required');
      }

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Find user
      let user: User | null;
      try {
        user = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });
      } catch (error) {
        throw new InternalServerErrorException('Database error during login');
      }

      if (!user) {
        // Always perform bcrypt comparison to prevent timing attacks
        await bcrypt.compare(password, '$2b$10$dummyhashforsecurity');
        throw new UnauthorizedException('Invalid email or password');
      }

      // Validate password
      let isPasswordValid: boolean;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (error) {
        throw new InternalServerErrorException('Password validation failed');
      }

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      let tokens: { access_token: string; refresh_token: string };
      try {
        tokens = this.generateTokens(user);
      } catch (error) {
        throw new InternalServerErrorException('Failed to generate tokens');
      }

      user.refreshToken = tokens.refresh_token;
      user.refreshTokenExpiresAt = this.calculateRefreshTokenExpiry();

      try {
        await this.userRepository.save(user);
      } catch (error) {
        throw new InternalServerErrorException('Failed to save refresh token');
      }

       
      const { password: _, refreshToken: __, ...userWithoutSensitive } = user;

      return {
        ...tokens,
        user: userWithoutSensitive,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed');
    }
  }

  private generateTokens(user: User): {
    access_token: string;
    refresh_token: string;
  } {
    // Validate user data
    if (!user || !user.id || !user.email) {
      throw new InternalServerErrorException(
        'Invalid user data for token generation',
      );
    }

    try {
      const payload = { email: user.email, sub: user.id };
      const access_token = this.jwtService.sign(payload);

      if (!access_token) {
        throw new InternalServerErrorException(
          'Failed to generate access token',
        );
      }

      const refreshPayload = { sub: user.id, type: 'refresh' };
      const refresh_token = this.refreshJwtService.sign(refreshPayload);

      if (!refresh_token) {
        throw new InternalServerErrorException(
          'Failed to generate refresh token',
        );
      }

      return {
        access_token,
        refresh_token,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Token generation failed');
    }
  }

  private calculateRefreshTokenExpiry(): Date {
    const refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const expiresAt = new Date();
    if (refreshTokenExpiresIn.includes('d')) {
      const days = parseInt(refreshTokenExpiresIn.replace('d', ''), 10);
      expiresAt.setDate(expiresAt.getDate() + days);
    } else if (refreshTokenExpiresIn.includes('h')) {
      const hours = parseInt(refreshTokenExpiresIn.replace('h', ''), 10);
      expiresAt.setHours(expiresAt.getHours() + hours);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    return expiresAt;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
        throw new BadRequestException('Refresh token is required');
      }

      const trimmedToken = refreshToken.trim();

      let payload: { sub: string; type?: string; exp?: number; iat?: number };
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const verified = this.refreshJwtService.verify(trimmedToken);
        payload = {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          sub: verified.sub as string,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          type: verified.type as string | undefined,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'TokenExpiredError') {
            throw new UnauthorizedException('Refresh token has expired');
          }
          if (error.name === 'JsonWebTokenError') {
            throw new UnauthorizedException('Invalid refresh token format');
          }
        }
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      let user: User | null;
      try {
        user = await this.userRepository.findOne({
          where: { refreshToken: trimmedToken },
        });
      } catch (error) {
        throw new InternalServerErrorException(
          'Database error during token refresh',
          error,
        );
      }

      if (!user) {
        throw new UnauthorizedException(
          'Refresh token has been revoked or does not exist',
        );
      }

      if (
        !user.refreshTokenExpiresAt ||
        new Date() > user.refreshTokenExpiresAt
      ) {
        try {
          user.refreshToken = null;
          user.refreshTokenExpiresAt = null;
          await this.userRepository.save(user);
        } catch (error) {
          throw new InternalServerErrorException(
            'Failed to save refresh token',
            error,
          );
        }
        throw new UnauthorizedException('Refresh token has expired');
      }

      if (user.id !== payload.sub) {
        throw new UnauthorizedException(
          'Token user mismatch - security violation',
        );
      }

      let tokens: { access_token: string; refresh_token: string };
      try {
        tokens = this.generateTokens(user);
      } catch (error) {
        throw new InternalServerErrorException(
          'Failed to generate new tokens',
          error,
        );
      }

      user.refreshToken = tokens.refresh_token;
      user.refreshTokenExpiresAt = this.calculateRefreshTokenExpiry();

      try {
        await this.userRepository.save(user);
      } catch (error) {
        throw new InternalServerErrorException(
          'Failed to save new refresh token',
          error,
        );
      }

      return tokens;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Token refresh failed');
    }
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    try {
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new BadRequestException('User ID is required');
      }

      try {
        await this.userRepository.update(userId.trim(), {
          refreshToken: null,
          refreshTokenExpiresAt: null,
        });
      } catch (error) {
        throw new InternalServerErrorException(
          'Failed to revoke refresh token',
          error,
        );
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Token revocation failed');
    }
  }

  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return null;
      }

      let user: User | null;
      try {
        user = await this.userRepository.findOne({ where: { id: id.trim() } });
      } catch (error) {
        throw new InternalServerErrorException(
          'Database error while finding user',
          error,
        );
      }

      if (!user) {
        return null;
      }

       
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      return null;
    }
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<
    Omit<User, 'password' | 'refreshToken' | 'refreshTokenExpiresAt'>
  > {
    try {
      // Validate input
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new BadRequestException('User ID is required');
      }

      if (!updateUserDto || (Object.keys(updateUserDto).length === 0)) {
        throw new BadRequestException(
          'At least one field must be provided for update',
        );
      }

      let user: User | null;
      try {
        user = await this.userRepository.findOne({
          where: { id: userId.trim() },
        });
      } catch (error) {
        throw new InternalServerErrorException(
          'Database error while finding user',
          error,
        );
      }

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (updateUserDto.email !== undefined) {
        if (!updateUserDto.email || typeof updateUserDto.email !== 'string') {
          throw new BadRequestException('Email must be a valid string');
        }

        const normalizedEmail = updateUserDto.email.toLowerCase().trim();
        if (normalizedEmail.length < 3 || !normalizedEmail.includes('@')) {
          throw new BadRequestException('Invalid email format');
        }

        if (normalizedEmail !== user.email.toLowerCase()) {
          let existingUser: User | null;
          try {
            existingUser = await this.userRepository.findOne({
              where: { email: normalizedEmail },
            });
          } catch (error) {
            throw new InternalServerErrorException(
              'Database error during email check',
            );
          }

          if (existingUser) {
            throw new ConflictException('Email is already taken');
          }
          user.email = normalizedEmail;
        }
      }

      if (updateUserDto.name !== undefined) {
        if (updateUserDto.name === null || updateUserDto.name === '') {
          throw new BadRequestException('Name cannot be empty');
        }

        if (typeof updateUserDto.name !== 'string') {
          throw new BadRequestException('Name must be a string');
        }

        const trimmedName = updateUserDto.name.trim();
        if (trimmedName.length < 2) {
          throw new BadRequestException(
            'Name must be at least 2 characters long',
          );
        }

        user.name = trimmedName;
      }

      let updatedUser: User;
      try {
        updatedUser = await this.userRepository.save(user);
      } catch (error) {
        if (error instanceof Error && error.message.includes('unique')) {
          throw new ConflictException('Email is already taken');
        }
        throw new InternalServerErrorException('Failed to update user');
      }
       
      const {
         
        password: _,
         
        refreshToken: __,
        ...userWithoutSensitive
      } = updatedUser;

      return userWithoutSensitive;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('User update failed');
    }
  }
}
