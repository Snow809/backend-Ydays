import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RagModule } from '../rag/rag.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AuditModule, RagModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
