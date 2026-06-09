import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async headcount() {
    return {
      headcount: await this.prisma.employee.count({ where: { leftAt: null } }),
      note: 'Power BI can later connect directly to PostgreSQL views for certified reporting.',
    };
  }

  absenteeism() {
    return {
      rate: 0,
      note: 'Mock only. Absence workflows are outside this backend skeleton.',
    };
  }

  turnover() {
    return {
      rate: 0,
      note: 'Mock only. Real turnover analytics require reliable historical data.',
    };
  }

  onboardingProgress() {
    return {
      averageProgress: 0,
      note: 'Simple computed onboarding indicators can later be exposed through DB views.',
    };
  }

  aiUsage() {
    return {
      questionsAsked: 0,
      refusals: 0,
      generatedDrafts: 0,
    };
  }

  alertsSummary() {
    return {
      open: 0,
      inProgress: 0,
      treated: 0,
      dismissed: 0,
    };
  }
}
