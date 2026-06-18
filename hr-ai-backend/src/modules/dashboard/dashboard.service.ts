import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async headcount() {
    const activeWhere = { leftAt: null };
    const [total, byDepartment, bySite] = await Promise.all([
      this.prisma.employee.count({ where: activeWhere }),
      this.prisma.employee.groupBy({
        by: ['department'],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.employee.groupBy({
        by: ['site'],
        where: activeWhere,
        _count: { _all: true },
      }),
    ]);

    return {
      headcount: total,
      byDepartment: byDepartment.map((item) => ({
        department: item.department ?? 'Non renseigne',
        count: item._count._all,
      })),
      bySite: bySite.map((item) => ({
        site: item.site ?? 'Non renseigne',
        count: item._count._all,
      })),
    };
  }

  async absenteeism() {
    const { periodStart, periodEnd } = this.currentMonthPeriod();
    const [activeEmployees, absences] = await Promise.all([
      this.prisma.employee.count({ where: { leftAt: null } }),
      this.prisma.absence.findMany({
        where: {
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
          status: { in: ['RECORDED', 'VALIDATED'] },
        },
      }),
    ]);

    const absenceDays = absences.reduce((total, absence) => {
      return total + (absence.durationDays ?? this.daysBetween(absence.startDate, absence.endDate));
    }, 0);

    const workingDaysApproximation = activeEmployees * 22;
    const rate =
      workingDaysApproximation === 0 ? 0 : Number(((absenceDays / workingDaysApproximation) * 100).toFixed(2));

    return {
      periodStart,
      periodEnd,
      activeEmployees,
      absenceCount: absences.length,
      absenceDays,
      rate,
    };
  }

  async turnover() {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setFullYear(periodStart.getFullYear() - 1);

    const [activeEmployees, leavers] = await Promise.all([
      this.prisma.employee.count({ where: { leftAt: null } }),
      this.prisma.employee.count({
        where: {
          leftAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      }),
    ]);

    const basePopulation = activeEmployees + leavers;
    const rate = basePopulation === 0 ? 0 : Number(((leavers / basePopulation) * 100).toFixed(2));

    return {
      periodStart,
      periodEnd,
      activeEmployees,
      leavers,
      rate,
    };
  }

  async onboardingProgress() {
    const [plans, overdueSteps] = await Promise.all([
      this.prisma.onboardingPlan.findMany({ include: { steps: true } }),
      this.prisma.onboardingStep.count({
        where: {
          completedAt: null,
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const totalSteps = plans.reduce((total, plan) => total + plan.steps.length, 0);
    const completedSteps = plans.reduce(
      (total, plan) => total + plan.steps.filter((step) => step.completedAt).length,
      0,
    );
    const averageProgress =
      totalSteps === 0 ? 0 : Number(((completedSteps / totalSteps) * 100).toFixed(2));

    return {
      plans: plans.length,
      totalSteps,
      completedSteps,
      overdueSteps,
      averageProgress,
    };
  }

  async aiUsage() {
    const [questionsAsked, assistantAnswers, refusals, generatedDrafts] = await Promise.all([
      this.prisma.chatMessage.count({ where: { role: 'USER' } }),
      this.prisma.chatMessage.count({ where: { role: 'ASSISTANT' } }),
      this.prisma.chatMessage.count({ where: { wasBlocked: true } }),
      this.prisma.generatedDocument.count(),
    ]);

    return {
      questionsAsked,
      assistantAnswers,
      refusals,
      generatedDrafts,
    };
  }

  async alertsSummary() {
    const [alerts, securityAlerts] = await Promise.all([
      this.prisma.alert.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.securityAlert.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const summary = {
      open: 0,
      inProgress: 0,
      treated: 0,
      dismissed: 0,
      securityOpen: 0,
      securityTotal: 0,
    };

    for (const alert of alerts) {
      if (alert.status === 'OPEN') summary.open = alert._count._all;
      if (alert.status === 'IN_PROGRESS') summary.inProgress = alert._count._all;
      if (alert.status === 'TREATED') summary.treated = alert._count._all;
      if (alert.status === 'DISMISSED') summary.dismissed = alert._count._all;
    }

    for (const alert of securityAlerts) {
      summary.securityTotal += alert._count._all;
      if (alert.status === 'OPEN') {
        summary.securityOpen += alert._count._all;
      }
    }

    return {
      ...summary,
      total: summary.open + summary.inProgress + summary.treated + summary.dismissed,
    };
  }

  async report() {
    const [headcount, absenteeism, turnover, onboardingProgress, aiUsage, alertsSummary] =
      await Promise.all([
        this.headcount(),
        this.absenteeism(),
        this.turnover(),
        this.onboardingProgress(),
        this.aiUsage(),
        this.alertsSummary(),
      ]);

    return {
      generatedAt: new Date(),
      headcount,
      absenteeism,
      turnover,
      onboardingProgress,
      aiUsage,
      alertsSummary,
    };
  }

  private currentMonthPeriod() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { periodStart, periodEnd };
  }

  private daysBetween(start: Date, end: Date) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay) + 1);
  }
}
