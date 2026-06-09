import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return Number(this.configService.get<string>('PORT') ?? 3000);
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'development-secret';
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '1d';
  }

  get uploadDir(): string {
    return this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
  }

  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST') ?? 'localhost';
  }

  get redisPort(): number {
    return Number(this.configService.get<string>('REDIS_PORT') ?? 6379);
  }
}
