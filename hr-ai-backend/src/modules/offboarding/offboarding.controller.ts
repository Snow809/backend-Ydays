import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InitiateOffboardingDto } from './dto/initiate-offboarding.dto';
import { UpdateOffboardingTaskDto } from './dto/update-offboarding-task.dto';
import { OffboardingService } from './offboarding.service';

@ApiTags('offboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offboarding')
export class OffboardingController {
  constructor(private readonly offboardingService: OffboardingService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Post('initiate')
  initiate(
    @Body() dto: InitiateOffboardingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.offboardingService.initiate(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('tasks/:employeeId')
  getTasks(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.offboardingService.getTasks(employeeId, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Patch('tasks/:taskId/status')
  updateTaskStatus(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateOffboardingTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.offboardingService.updateTaskStatus(taskId, dto.status, user);
  }
}
