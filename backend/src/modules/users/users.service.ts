import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/role.enum';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { TenantStatus } from '../../common/enums/tenant-status.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface CreateUserInput {
  tenantId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  private readonly saltRounds = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = this.userRepository.create(input);
    return this.userRepository.save(user);
  }

  async createInTenant(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmailInTenant(tenantId, dto.email);
    if (existing) {
      throw new ConflictException('Email already exists in this tenant');
    }
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    return this.create({
      tenantId,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
  }

  async createTeacher(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmailGlobal(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    return this.create({
      tenantId,
      email: dto.email,
      passwordHash,
      role: UserRole.TEACHER,
    });
  }

  async createSchool(dto: CreateUserDto & { tenantName: string }): Promise<User> {
    const existing = await this.findByEmailGlobal(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const tenant = this.tenantRepository.create({
      name: dto.tenantName,
      status: TenantStatus.ACTIVE,
    });
    const savedTenant = await this.tenantRepository.save(tenant);

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    return this.create({
      tenantId: savedTenant.id,
      email: dto.email,
      passwordHash,
      role: UserRole.SCHOOL_ADMIN,
    });
  }

  async findAllByTenant(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIdInTenant(tenantId: string, id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmailGlobal(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailInTenant(
    tenantId: string,
    email: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({ where: { tenantId, email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async updateInTenant(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findByIdInTenant(tenantId, id);
    if (dto.email) user.email = dto.email;
    if (dto.role) user.role = dto.role;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    }
    return this.userRepository.save(user);
  }

  async removeInTenant(tenantId: string, id: string): Promise<void> {
    const user = await this.findByIdInTenant(tenantId, id);
    await this.userRepository.remove(user);
  }
}
