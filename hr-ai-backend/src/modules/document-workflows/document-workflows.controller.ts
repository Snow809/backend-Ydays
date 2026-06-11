import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { RejectDocumentRequestDto } from './dto/reject-document-request.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';
import { DocumentWorkflowsService } from './document-workflows.service';

@ApiTags('document-workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DocumentWorkflowsController {
  constructor(private readonly documentWorkflowsService: DocumentWorkflowsService) {}

  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Post('document-templates')
  createTemplate(
    @Body() dto: CreateDocumentTemplateDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentWorkflowsService.createTemplate(dto, file, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('document-templates')
  findTemplates() {
    return this.documentWorkflowsService.findTemplates();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('document-templates/active')
  findActiveTemplates() {
    return this.documentWorkflowsService.findActiveTemplates();
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('document-templates/:id')
  findTemplate(@Param('id') id: string) {
    return this.documentWorkflowsService.findTemplate(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Patch('document-templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentTemplateDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentWorkflowsService.updateTemplate(id, dto, file, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Patch('document-templates/:id/deactivate')
  deactivateTemplate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentWorkflowsService.deactivateTemplate(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Delete('document-templates/:id')
  deleteTemplate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentWorkflowsService.deleteTemplate(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.COLLABORATOR)
  @Post('document-requests')
  createRequest(@Body() dto: CreateDocumentRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentWorkflowsService.createRequest(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('document-requests/me')
  findMyRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.documentWorkflowsService.findMyRequests(user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('document-requests/pending-approval')
  findPendingApproval(@CurrentUser() user: AuthenticatedUser) {
    return this.documentWorkflowsService.findPendingApproval(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('document-requests/history')
  findRequestHistory() {
    return this.documentWorkflowsService.findRequestHistory();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('document-requests/:id/approve')
  approveRequest(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentWorkflowsService.approveRequest(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('document-requests/:id/reject')
  rejectRequest(
    @Param('id') id: string,
    @Body() dto: RejectDocumentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentWorkflowsService.rejectRequest(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.COLLABORATOR)
  @Get('document-requests/:id/download')
  async downloadRequest(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const file = await this.documentWorkflowsService.prepareDownload(id, user);
    return response.download(file.filePath, file.fileName);
  }
}
