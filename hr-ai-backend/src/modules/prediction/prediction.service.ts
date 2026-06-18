import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PredictionService {
  constructor(private readonly prisma: PrismaService) {}

  async workforceProjection() {
    const activeEmployees = await this.prisma.employee.count({
      where: { leftAt: null },
    });

    const historicalHires = await this.prisma.employee.findMany({
      where: { hiredAt: { not: null } },
      select: { hiredAt: true, leftAt: true },
    });

    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    let hiresInPastYear = 0;
    let departuresInPastYear = 0;

    for (const emp of historicalHires) {
      if (emp.hiredAt && emp.hiredAt >= oneYearAgo) {
        hiresInPastYear++;
      }
      if (emp.leftAt && emp.leftAt >= oneYearAgo) {
        departuresInPastYear++;
      }
    }

    const avgHiresPerMonth = Math.max(1, hiresInPastYear / 12);
    const avgDeparturesPerMonth = Math.max(0.5, departuresInPastYear / 12);
    const netGrowthPerMonth = avgHiresPerMonth - avgDeparturesPerMonth;

    const projections = [];
    let projectedHeadcount = activeEmployees;

    for (let monthOffset = 1; monthOffset <= 12; monthOffset++) {
      const projDate = new Date();
      projDate.setMonth(projDate.getMonth() + monthOffset);
      const monthStr = `${projDate.getFullYear()}-${String(projDate.getMonth() + 1).padStart(2, '0')}`;

      projectedHeadcount += netGrowthPerMonth;

      projections.push({
        month: monthStr,
        projectedHeadcount: Math.round(projectedHeadcount),
        expectedHires: Math.round(avgHiresPerMonth),
        expectedDepartures: Math.round(avgDeparturesPerMonth),
      });
    }

    return {
      type: 'workforce-projection',
      currentHeadcount: activeEmployees,
      projections,
      calculatedAt: new Date(),
    };
  }

  async turnoverRisk() {
    const employees = await this.prisma.employee.findMany({
      where: { leftAt: null },
      include: { absences: true },
    });

    const results = [];

    await this.prisma.predictionScore.deleteMany({
      where: { predictionType: 'turnover-risk' },
    });

    for (const emp of employees) {
      let score = 0.1;
      const explanations = [];

      if (emp.hiredAt) {
        const seniorityYears = (new Date().getTime() - new Date(emp.hiredAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (seniorityYears < 1) {
          score += 0.25;
          explanations.push('Ancienneté inférieure à 1 an.');
        } else if (seniorityYears > 5) {
          score -= 0.05;
        }
      }

      const recentAbsences = emp.absences.length;
      if (recentAbsences > 5) {
        score += 0.35;
        explanations.push(`Nombre d'absences élevé (${recentAbsences} absences enregistrées).`);
      } else if (recentAbsences > 2) {
        score += 0.15;
        explanations.push(`Quelques absences récentes (${recentAbsences} absences).`);
      }

      if (!emp.managerId) {
        score += 0.15;
        explanations.push('Pas de manager direct associé.');
      }

      score = Math.min(1.0, Math.max(0.0, score));

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (score >= 0.75) riskLevel = 'CRITICAL';
      else if (score >= 0.5) riskLevel = 'HIGH';
      else if (score >= 0.25) riskLevel = 'MEDIUM';

      if (explanations.length === 0) {
        explanations.push('Profil stable sans signal faible détecté.');
      }

      const prediction = await this.prisma.predictionScore.create({
        data: {
          employeeId: emp.id,
          predictionType: 'turnover-risk',
          score,
          riskLevel,
          explanation: { factors: explanations },
        },
        include: { employee: true },
      });

      results.push(prediction);
    }

    return results;
  }

  async absenteeismTrend() {
    const absences = await this.prisma.absence.findMany({
      where: { status: 'VALIDATED' },
      include: {
        employee: {
          include: { departmentEntity: true },
        },
      },
    });

    const trends: Record<string, { month: string; totalDays: number; absenceCount: number }> = {};

    for (const absence of absences) {
      const date = new Date(absence.startDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const deptName = absence.employee.departmentEntity?.name ?? absence.employee.department ?? 'Inconnu';
      const key = `${monthKey}_${deptName}`;

      const duration = absence.durationDays ?? 1;

      if (!trends[key]) {
        trends[key] = {
          month: monthKey,
          totalDays: 0,
          absenceCount: 0,
        };
      }
      trends[key].totalDays += duration;
      trends[key].absenceCount += 1;
    }

    const data = Object.entries(trends).map(([key, value]) => {
      const dept = key.substring(key.indexOf('_') + 1);
      return {
        month: value.month,
        department: dept,
        totalAbsenceDays: value.totalDays,
        absenceCount: value.absenceCount,
      };
    }).sort((a, b) => a.month.localeCompare(b.month));

    return {
      type: 'absenteeism-trend',
      data,
      calculatedAt: new Date(),
    };
  }
}

