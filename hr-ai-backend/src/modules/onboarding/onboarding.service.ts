import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CompleteOnboardingStepDto } from './dto/complete-onboarding-step.dto';
import { GenerateOnboardingPlanDto } from './dto/generate-onboarding-plan.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: GenerateOnboardingPlanDto, user: AuthenticatedUser) {
    const ids = dto.employeeIds || (dto.employeeId ? [dto.employeeId] : []);
    if (ids.length === 0) {
      throw new BadRequestException('At least one employeeId or employeeIds is required');
    }

    // Enforce Manager permissions: Managers can only generate for their direct reports
    if (user.role === 'MANAGER') {
      const managerEmployee = await this.prisma.employee.findUnique({
        where: { userId: user.userId },
      });
      if (!managerEmployee) {
        throw new ForbiddenException('You are not linked to an employee profile.');
      }

      for (const employeeId of ids) {
        const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!emp || emp.managerId !== managerEmployee.id) {
          throw new ForbiddenException('You can only generate onboarding plans for your direct reports.');
        }
      }
    }

    const plans = [];
    for (const employeeId of ids) {
      const existing = await this.prisma.onboardingPlan.findFirst({
        where: { employeeId },
        include: { steps: true },
      });
      if (existing) {
        plans.push(existing);
        continue;
      }

      const plan = await this.generateSingle(employeeId, dto.startsAt);
      plans.push(plan);
    }

    return plans.length === 1 ? plans[0] : plans;
  }

  private async generateSingle(employeeId: string, startsAtStr?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        departmentEntity: true,
        positionEntity: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const startsAt = startsAtStr ? new Date(startsAtStr) : new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 30);

    const stepsData = [];

    // 1. General/Administrative Steps (Applies to everyone)
    const day1 = new Date(startsAt);
    stepsData.push({
      title: 'Welcome and account setup',
      description: 'Configure corporate email, chat tools, and workspace equipment.',
      dueDate: new Date(day1),
    });

    const day2 = new Date(startsAt);
    day2.setDate(day2.getDate() + 1);
    stepsData.push({
      title: 'HR Briefing and Handbook review',
      description: 'Review HR benefits, company values, and compliance guidelines.',
      dueDate: new Date(day2),
    });

    const day7 = new Date(startsAt);
    day7.setDate(day7.getDate() + 6);
    stepsData.push({
      title: 'First week check-in with Manager',
      description: 'Discuss initial onboarding progress, align on early objectives and tasks.',
      dueDate: new Date(day7),
    });

    const day15 = new Date(startsAt);
    day15.setDate(day15.getDate() + 14);
    stepsData.push({
      title: 'Mid-term onboarding evaluation',
      description: 'Review learnings, gather feedback on early integrations, and adjust plan.',
      dueDate: new Date(day15),
    });

    const day30 = new Date(startsAt);
    day30.setDate(day30.getDate() + 29);
    stepsData.push({
      title: 'Final onboarding review and sign-off',
      description: 'Final check-in to validate completion of the onboarding path.',
      dueDate: new Date(day30),
    });

    // 2. Department-specific steps
    const deptName = (employee.departmentEntity?.name || employee.department || '').toLowerCase();

    if (
      deptName.includes('tech') ||
      deptName.includes('it') ||
      deptName.includes('dev') ||
      deptName.includes('engineering')
    ) {
      const d3 = new Date(startsAt);
      d3.setDate(d3.getDate() + 2);
      stepsData.push({
        title: 'Technical setup and access requests',
        description: 'Set up local development environment, request access to GitHub/GitLab, and configure SSH keys.',
        dueDate: d3,
      });

      const d5 = new Date(startsAt);
      d5.setDate(d5.getDate() + 4);
      stepsData.push({
        title: 'Codebase architecture walkthrough',
        description: 'Meet with a senior developer to walk through the system architecture and core repositories.',
        dueDate: d5,
      });

      const d12 = new Date(startsAt);
      d12.setDate(d12.getDate() + 11);
      stepsData.push({
        title: 'First code contribution (PR)',
        description: 'Pick an onboarding issue, implement a small change, and open a Pull Request for review.',
        dueDate: d12,
      });

      const d20 = new Date(startsAt);
      d20.setDate(d20.getDate() + 19);
      stepsData.push({
        title: 'CI/CD and deployment pipeline training',
        description: 'Review the staging and production deployment steps and run a pipeline test.',
        dueDate: d20,
      });
    } else if (
      deptName.includes('sale') ||
      deptName.includes('commerce') ||
      deptName.includes('marketing')
    ) {
      const d3 = new Date(startsAt);
      d3.setDate(d3.getDate() + 2);
      stepsData.push({
        title: 'CRM and sales tools onboarding',
        description: 'Set up accounts in Salesforce/HubSpot, read through customer personas and templates.',
        dueDate: d3,
      });

      const d6 = new Date(startsAt);
      d6.setDate(d6.getDate() + 5);
      stepsData.push({
        title: 'Product demo and value proposition review',
        description: 'Participate in a deep dive product walkthrough and study sales enablement documents.',
        dueDate: d6,
      });

      const d10 = new Date(startsAt);
      d10.setDate(d10.getDate() + 9);
      stepsData.push({
        title: 'Shadow sales calls / Customer meetings',
        description: 'Join at least three client calls as a silent observer to learn sales flows and pitch techniques.',
        dueDate: d10,
      });
    } else if (
      deptName.includes('rh') ||
      deptName.includes('hr') ||
      deptName.includes('human') ||
      deptName.includes('ressource') ||
      deptName.includes('recrut') ||
      deptName.includes('talent')
    ) {
      const d3 = new Date(startsAt);
      d3.setDate(d3.getDate() + 2);
      stepsData.push({
        title: 'ATS and HRIS tool training',
        description: 'Request recruiter/admin access to current HRIS, ATS (Applicant Tracking System), and onboarding pipelines.',
        dueDate: d3,
      });

      const d8 = new Date(startsAt);
      d8.setDate(d8.getDate() + 7);
      stepsData.push({
        title: 'Shadowing teammate in interview',
        description: 'Observe a live recruitment or exit interview led by a teammate to understand company guidelines.',
        dueDate: d8,
      });
    } else if (
      deptName.includes('product') ||
      deptName.includes('design') ||
      deptName.includes('ux') ||
      deptName.includes('ui')
    ) {
      const d3 = new Date(startsAt);
      d3.setDate(d3.getDate() + 2);
      stepsData.push({
        title: 'Design system and specs overview',
        description: 'Familiarize yourself with the current UI design system, Figma libraries, and product specs.',
        dueDate: d3,
      });

      const d8 = new Date(startsAt);
      d8.setDate(d8.getDate() + 7);
      stepsData.push({
        title: 'Product roadmap walk-through',
        description: 'Review active epic documentation and current development sprints with a Product Manager.',
        dueDate: d8,
      });
    }

    stepsData.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return this.prisma.onboardingPlan.create({
      data: {
        employeeId,
        title: `Onboarding Plan - ${employee.fullName}`,
        startsAt,
        endsAt,
        steps: {
          create: stepsData,
        },
      },
      include: { steps: true },
    });
  }

  findAll() {
    return this.prisma.onboardingPlan.findMany({ include: { steps: true } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.checkPlanAccess(id, user);

    return this.prisma.onboardingPlan.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            manager: true,
            departmentEntity: true,
            positionEntity: true,
          },
        },
        steps: true,
      },
    });
  }

  async completeStep(id: string, _dto: CompleteOnboardingStepDto, user: AuthenticatedUser) {
    const step = await this.prisma.onboardingStep.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!step) {
      throw new NotFoundException('Onboarding step not found');
    }

    await this.checkPlanAccess(step.plan.id, user);

    return this.prisma.onboardingStep.update({
      where: { id },
      data: { completedAt: new Date() },
    });
  }

  async progress(id: string, user: AuthenticatedUser) {
    await this.checkPlanAccess(id, user);

    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id },
      include: { steps: true },
    });
    const total = plan?.steps.length ?? 0;
    const completed = plan?.steps.filter((step) => step.completedAt).length ?? 0;
    const overdue = plan?.steps.filter((step) => !step.completedAt && step.dueDate && step.dueDate < new Date()).length ?? 0;

    let status = 'Non activé';
    if (plan) {
      status = (total > 0 && completed === total) ? 'Terminé' : 'En cours';
    }

    return {
      planId: id,
      status,
      totalSteps: total,
      completedSteps: completed,
      overdueSteps: overdue,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
      note: 'No LMS features are included in this MVP skeleton.',
    };
  }

  async recommendations(id: string, user: AuthenticatedUser) {
    await this.checkPlanAccess(id, user);

    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            manager: true,
            departmentEntity: true,
            positionEntity: true,
          },
        },
        steps: true,
      },
    });

    if (!plan) {
      return {
        planId: id,
        status: 'not_found',
        recommendations: [],
        documents: [],
      };
    }

    const documents = await this.prisma.hRDocument.findMany({
      where: {
        status: 'VALIDATED',
        OR: [
          { employeeId: null },
          { employeeId: plan.employeeId },
          { category: { contains: 'onboarding', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        category: true,
        documentType: true,
        confidentialityLevel: true,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      planId: id,
      employee: {
        id: plan.employee.id,
        fullName: plan.employee.fullName,
        department: plan.employee.departmentEntity?.name ?? plan.employee.department,
        position: plan.employee.positionEntity?.title ?? plan.employee.position,
        manager: plan.employee.manager?.fullName ?? null,
      },
      recommendations: [
        'Verifier les acces applicatifs du collaborateur.',
        'Planifier un point manager pendant la premiere semaine.',
        'Partager les documents RH valides utiles pour son poste.',
      ],
      documents,
      pendingSteps: plan.steps.filter((step) => !step.completedAt).map((step) => ({
        id: step.id,
        title: step.title,
        dueDate: step.dueDate,
      })),
    };
  }

  async generateDelayAlerts() {
    const overdueSteps = await this.prisma.onboardingStep.findMany({
      where: {
        completedAt: null,
        dueDate: { lt: new Date() },
      },
      include: {
        plan: {
          include: {
            employee: true,
          },
        },
      },
    });

    const createdAlerts = [];

    for (const step of overdueSteps) {
      const existingAlert = await this.prisma.alert.findFirst({
        where: {
          type: 'ONBOARDING_DELAY',
          targetId: step.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      if (existingAlert) {
        continue;
      }

      const alert = await this.prisma.alert.create({
        data: {
          type: 'ONBOARDING_DELAY',
          title: 'Onboarding step is overdue',
          message: `${step.plan.employee.fullName}: ${step.title}`,
          targetId: step.id,
        },
      });
      createdAlerts.push(alert);
    }

    return {
      checkedSteps: overdueSteps.length,
      createdAlerts: createdAlerts.length,
      alerts: createdAlerts,
    };
  }

  private async checkPlanAccess(planId: string, user: AuthenticatedUser) {
    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id: planId },
      include: {
        employee: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Onboarding plan not found');
    }

    // Admins and HR have access to all plans
    if (user.role === 'ADMIN' || user.role === 'HR') {
      return plan;
    }

    // Managers have access only to their direct reports
    if (user.role === 'MANAGER') {
      const managerEmployee = await this.prisma.employee.findUnique({
        where: { userId: user.userId },
      });
      if (!managerEmployee || plan.employee.managerId !== managerEmployee.id) {
        throw new ForbiddenException('You are not authorized to access this onboarding plan.');
      }
      return plan;
    }

    // Collaborators have access only to their own plan
    if (user.role === 'COLLABORATOR') {
      if (plan.employee.userId !== user.userId) {
        throw new ForbiddenException('You are not authorized to access this onboarding plan.');
      }
      return plan;
    }

    throw new ForbiddenException('You are not authorized to access this onboarding plan.');
  }
}
