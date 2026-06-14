import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ChatFeedbackDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  helpful: boolean;

  @ApiProperty({ required: false, example: 'La reponse est claire mais il manque la source.' })
  @IsOptional()
  @IsString()
  comment?: string;
}

