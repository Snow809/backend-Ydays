import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InitiateOffboardingDto } from './dto/initiate-offboarding.dto';
import { WorkflowTaskStatus, WorkflowType } from '@prisma/client';

@Injectable()
export class OffboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(dto: InitiateOffboardingDto, _user: AuthenticatedUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
    }

    const leftAtDate = dto.leftAt ? new Date(dto.leftAt) : new Date();

    // Update leftAt on employee profile
    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { leftAt: leftAtDate },
    });

    // Clean up or define tasks
    const tasksToCreate = [
      {
        title: 'Restitution du matériel (Badge, Ordinateur, Téléphone)',
        description: 'Récupérer tous les équipements physiques confiés au collaborateur.',
        dueDate: new Date(leftAtDate),
      },
      {
        title: 'Suppression des accès informatiques (GitHub, Slack, Email)',
        description: 'Révoquer les accès aux différents outils et outils de communication internes.',
        dueDate: new Date(leftAtDate),
      },
      {
        title: 'Entretien de départ (Exit Interview) avec les RH',
        description: 'Organiser une entrevue pour recueillir le feedback de départ.',
        dueDate: new Date(leftAtDate),
      },
      {
        title: 'Signature des documents de fin de contrat',
        description: 'Établir et signer le solde de tout compte et le certificat de travail.',
        dueDate: new Date(leftAtDate),
      },
    ];

    const createdTasks = [];
    for (const task of tasksToCreate) {
      // Check if this task already exists to avoid duplicates
      const existing = await this.prisma.workflowTask.findFirst({
        where: {
          employeeId: dto.employeeId,
          workflowType: WorkflowType.OFFBOARDING,
          title: task.title,
        },
      });

      if (existing) {
        createdTasks.push(existing);
        continue;
      }

      const newTask = await this.prisma.workflowTask.create({
        data: {
          employeeId: dto.employeeId,
          workflowType: WorkflowType.OFFBOARDING,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: WorkflowTaskStatus.TODO,
        },
      });
      createdTasks.push(newTask);
    }

    // Create a notification Alert
    await this.prisma.alert.create({
      data: {
        type: 'DOCUMENT_MISSING', // or closest match
        title: 'Procédure de sortie initiée',
        message: `L'offboarding a été lancé pour ${employee.fullName}.`,
        targetId: employee.id,
      },
    });

    return {
      employeeId: employee.id,
      fullName: employee.fullName,
      leftAt: leftAtDate,
      tasks: createdTasks,
    };
  }

  async getTasks(employeeId: string, user: AuthenticatedUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Role-based visibility logic
    if (user.role === 'COLLABORATOR') {
      if (employee.userId !== user.userId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à consulter ces tâches.");
      }
    } else if (user.role === 'MANAGER') {
      const managerEmployee = await this.prisma.employee.findUnique({
        where: { userId: user.userId },
      });
      if (!managerEmployee || employee.managerId !== managerEmployee.id) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à consulter ces tâches.");
      }
    }

    return this.prisma.workflowTask.findMany({
      where: {
        employeeId,
        workflowType: WorkflowType.OFFBOARDING,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTaskStatus(taskId: string, status: WorkflowTaskStatus, user: AuthenticatedUser) {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
      include: { employee: true },
    });

    if (!task) {
      throw new NotFoundException(`Workflow task with ID ${taskId} not found`);
    }

    if (task.workflowType !== WorkflowType.OFFBOARDING) {
      throw new BadRequestException('This task is not an offboarding task.');
    }

    // Security check
    if (user.role === 'COLLABORATOR') {
      // Collaborators can only update tasks if assigned to them or if it's their profile and allowed
      if (task.employee.userId !== user.userId && task.assignedToId !== user.userId) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette tâche.");
      }
    } else if (user.role === 'MANAGER') {
      const managerEmployee = await this.prisma.employee.findUnique({
        where: { userId: user.userId },
      });
      if (!managerEmployee || task.employee.managerId !== managerEmployee.id) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette tâche.");
      }
    }

    return this.prisma.workflowTask.update({
      where: { id: taskId },
      data: { status },
    });
  }
}
