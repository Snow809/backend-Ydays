import { Module } from '@nestjs/common';
import { DataImportsController } from './data-imports.controller';
import { DataImportsService } from './data-imports.service';

@Module({
  controllers: [DataImportsController],
  providers: [DataImportsService],
})
export class DataImportsModule {}
