import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompleteOnboardingStepDto } from './dto/complete-onboarding-step.dto';
import { GenerateOnboardingPlanDto } from './dto/generate-onboarding-plan.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Post('generate')
  generate(@Body() dto: GenerateOnboardingPlanDto) {
    return this.onboardingService.generate(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get()
  findAll() {
    return this.onboardingService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.onboardingService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Patch('steps/:id/complete')
  completeStep(@Param('id') id: string, @Body() dto: CompleteOnboardingStepDto) {
    return this.onboardingService.completeStep(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Get(':id/progress')
  progress(@Param('id') id: string) {
    return this.onboardingService.progress(id);
  }
}
