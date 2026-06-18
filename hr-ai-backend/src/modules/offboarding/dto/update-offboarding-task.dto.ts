import { IsEnum, IsNotEmpty } from 'class-validator';
import { WorkflowTaskStatus } from '@prisma/client';

export class UpdateOffboardingTaskDto {
  @IsEnum(WorkflowTaskStatus)
  @IsNotEmpty()
  status: WorkflowTaskStatus;
}
