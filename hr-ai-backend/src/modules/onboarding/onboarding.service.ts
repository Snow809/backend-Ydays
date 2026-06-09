import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompleteOnboardingStepDto } from './dto/complete-onboarding-step.dto';
import { GenerateOnboardingPlanDto } from './dto/generate-onboarding-plan.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: GenerateOnboardingPlanDto) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 30);

    return this.prisma.onboardingPlan.create({
      data: {
        employeeId: dto.employeeId,
        title: '30-day onboarding plan placeholder',
        startsAt,
        endsAt,
        steps: {
          create: [
            { title: 'Welcome and account setup', dueDate: startsAt },
            { title: 'Manager check-in', dueDate: endsAt },
          ],
        },
      },
      include: { steps: true },
    });
  }

  findAll() {
    return this.prisma.onboardingPlan.findMany({ include: { steps: true } });
  }

  findOne(id: string) {
    return this.prisma.onboardingPlan.findUnique({
      where: { id },
      include: { steps: true },
    });
  }

  completeStep(id: string, _dto: CompleteOnboardingStepDto) {
    return this.prisma.onboardingStep.update({
      where: { id },
      data: { completedAt: new Date() },
    });
  }

  async progress(id: string) {
    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id },
      include: { steps: true },
    });
    const total = plan?.steps.length ?? 0;
    const completed = plan?.steps.filter((step) => step.completedAt).length ?? 0;

    return {
      planId: id,
      totalSteps: total,
      completedSteps: completed,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
      note: 'No LMS features are included in this MVP skeleton.',
    };
  }
}
