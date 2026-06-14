import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class EscalateConversationDto {
  @ApiProperty({ required: false, example: 'Question sensible qui necessite une validation RH.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

