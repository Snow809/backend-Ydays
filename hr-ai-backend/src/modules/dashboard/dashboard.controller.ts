import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION)
  @Get('headcount')
  headcount() {
    return this.dashboardService.headcount();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION, UserRole.QVT)
  @Get('absenteeism')
  absenteeism() {
    return this.dashboardService.absenteeism();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION)
  @Get('turnover')
  turnover() {
    return this.dashboardService.turnover();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get('onboarding-progress')
  onboardingProgress() {
    return this.dashboardService.onboardingProgress();
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('ai-usage')
  aiUsage() {
    return this.dashboardService.aiUsage();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.QVT)
  @Get('alerts-summary')
  alertsSummary() {
    return this.dashboardService.alertsSummary();
  }
}
