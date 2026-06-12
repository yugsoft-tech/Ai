import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/role.enum';
import { TenantStatus } from '../../common/enums/tenant-status.enum';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByEmailGlobal(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    let tenantId = dto.tenantId;
    if (!tenantId) {
      const tenant = this.tenantRepository.create({
        name: dto.tenantName ?? `${dto.email.split('@')[0]} School`,
        status: TenantStatus.ACTIVE,
      });
      const saved = await this.tenantRepository.save(tenant);
      tenantId = saved.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.usersService.create({
      tenantId,
      email: dto.email,
      passwordHash,
      role: UserRole.STUDENT,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async validateOAuthUser(email: string, name: string) {
    const existing = await this.usersService.findByEmailGlobal(email);
    if (existing) {
      return existing;
    }

    // Create a new user with a generated tenant if they don't exist
    const tenant = this.tenantRepository.create({
      name: `${name}'s School`,
      status: TenantStatus.ACTIVE,
    });
    const savedTenant = await this.tenantRepository.save(tenant);

    // Generate random password for OAuth users since they won't use it
    const randomPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(randomPassword, this.saltRounds);
    
    return this.usersService.create({
      tenantId: savedTenant.id,
      email,
      passwordHash,
      role: UserRole.STUDENT,
    });
  }

  getAuthResponse(user: User) {
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
