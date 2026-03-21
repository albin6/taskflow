import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super_secret_key_change_me'),
    });
  }

  async validate(payload: any) {
    const { sub } = payload;
    
    // Optional: Fetch latest user from DB to ensure they aren't deleted or suspended mid-session
    const user = await this.userRepository.findOne({
      where: { id: sub },
      relations: ['role', 'team'],
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      teamId: user.team?.id || null,
      roleId: user.role?.id || null,
      level: user.role?.level ?? 99,
      permissions: user.role?.permissions || [],
    };
  }
}
