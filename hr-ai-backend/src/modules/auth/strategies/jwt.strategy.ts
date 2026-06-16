import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/config.service';
import { RedisService } from '../../../common/redis/redis.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  fullName?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    console.log('JwtStrategy.validate payload:', payload);
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    
    if (token) {
      const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        console.log('Token is blacklisted');
        throw new UnauthorizedException('Token has been revoked');
      }
    } else {
      console.log('No token found in request');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName || payload.email.split('@')[0],
    };
  }
}
