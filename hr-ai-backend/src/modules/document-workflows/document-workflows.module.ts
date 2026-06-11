import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../../services/storage/storage.module';
import { DocumentWorkflowsController } from './document-workflows.controller';
import { DocumentWorkflowsService } from './document-workflows.service';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [DocumentWorkflowsController],
  providers: [DocumentWorkflowsService],
})
export class DocumentWorkflowsModule {}
