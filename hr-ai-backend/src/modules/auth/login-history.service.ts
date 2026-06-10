import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LoginHistoryService {
  constructor(private prisma: PrismaService) {}

  async recordLogin(userId: string, email: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.loginHistory.create({
      data: {
        userId,
        email,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    });
  }

  async recordFailedLogin(email: string, ipAddress?: string, userAgent?: string) {
    return this.prisma.loginHistory.create({
      data: {
        email,
        ipAddress,
        userAgent,
        status: 'FAILED',
      },
    });
  }

  async getUserLoginHistory(userId: string, limit: number = 50) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
    });
  }

  async getAllLoginHistory(limit: number = 100) {
    return this.prisma.loginHistory.findMany({
      orderBy: { loginAt: 'desc' },
      take: limit,
      include: { user: { select: { email: true, role: true } } },
    });
  }
}
