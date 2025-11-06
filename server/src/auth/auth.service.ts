import {
  Injectable,
  UnauthorizedException,
  ConflictException,
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
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    const savedUser = await this.userRepository.save(user);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: __, ...userWithoutPassword } = savedUser;
    return { user: userWithoutPassword };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    user: Omit<User, 'password' | 'refreshToken'>;
  }> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update user with refresh token
    user.refreshToken = tokens.refresh_token;
    user.refreshTokenExpiresAt = this.calculateRefreshTokenExpiry();
    await this.userRepository.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, refreshToken: __, ...userWithoutSensitive } = user;

    return {
      ...tokens,
      user: userWithoutSensitive,
    };
  }

  private generateTokens(user: User): {
    access_token: string;
    refresh_token: string;
  } {
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    const refreshPayload = { sub: user.id, type: 'refresh' };
    const refresh_token = this.refreshJwtService.sign(refreshPayload);

    return {
      access_token,
      refresh_token,
    };
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
    let payload: { sub: string; type?: string };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const verified = this.refreshJwtService.verify(refreshToken);
      payload = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        sub: verified.sub as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        type: verified.type as string | undefined,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({
      where: { refreshToken },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (
      !user.refreshTokenExpiresAt ||
      new Date() > user.refreshTokenExpiresAt
    ) {
      user.refreshToken = null;
      user.refreshTokenExpiresAt = null;
      await this.userRepository.save(user);
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (user.id !== payload.sub) {
      throw new UnauthorizedException('Token user mismatch');
    }

    const tokens = this.generateTokens(user);

    user.refreshToken = tokens.refresh_token;
    user.refreshTokenExpiresAt = this.calculateRefreshTokenExpiry();
    await this.userRepository.save(user);

    return tokens;
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: null,
      refreshTokenExpiresAt: null,
    });
  }

  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<
    Omit<User, 'password' | 'refreshToken' | 'refreshTokenExpiresAt'>
  > {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email is already taken');
      }
      user.email = updateUserDto.email;
    }
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    const updatedUser = await this.userRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      password: _,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      refreshToken: __,
      ...userWithoutSensitive
    } = updatedUser;

    return userWithoutSensitive;
  }
}
