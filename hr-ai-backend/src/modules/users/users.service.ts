import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: 'COLLABORATOR',
      },
      select: this.safeUserSelect(),
    });

    return user;
  }

  findAll() {
    return this.prisma.user.findMany({ select: this.safeUserSelect() });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect(),
    });
  }

  async updateRole(id: string, dto: UpdateUserRoleDto, actor?: AuthenticatedUser) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: this.safeUserSelect(),
    });
    await this.auditService.logRoleChange(actor?.userId, id, { role: dto.role });
    return user;
  }

  deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.safeUserSelect(),
    });
  }

  private safeUserSelect() {
    return {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}
