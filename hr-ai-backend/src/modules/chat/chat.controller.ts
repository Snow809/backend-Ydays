import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ChatService } from './chat.service';
import { ChatFeedbackDto } from './dto/chat-feedback.dto';
import { EscalateConversationDto } from './dto/escalate-conversation.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('ask')
  ask(@Body() dto: AskQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.ask(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('conversations')
  findConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.findConversations(user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('conversations/:id')
  findConversation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.findConversation(id, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('messages/:id/feedback')
  addFeedback(
    @Param('id') id: string,
    @Body() dto: ChatFeedbackDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.addFeedback(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('conversations/:id/escalate')
  escalateConversation(
    @Param('id') id: string,
    @Body() dto: EscalateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.escalateConversation(id, dto, user);
  }
}
