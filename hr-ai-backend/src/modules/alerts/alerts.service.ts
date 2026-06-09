import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAlertDto) {
    return this.prisma.alert.create({ data: dto as any });
  }

  findAll() {
    return this.prisma.alert.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.alert.findUnique({ where: { id } });
  }

  updateStatus(id: string, dto: UpdateAlertStatusDto) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }
}
