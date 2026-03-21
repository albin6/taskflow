import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Team } from '../teams/entities/team.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus, ApprovalStatus } from '../common/enums';
import { ApprovalRequest } from '../approvals/entities/approval-request.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { name, email, password, phone, teamId, roleId } = registerDto;

    // 1. Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    // 2. Validate Team and Role
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team with ID "${teamId}" not found.`);
    }

    const role = await this.roleRepository.findOne({ 
      where: { id: roleId },
      relations: ['team'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found.`);
    }

    // Ensure role belongs to target team OR is global (though custom roles aren't global)
    if (role.team && role.team.id !== teamId) {
      throw new ConflictException('The selected role does not belong to the selected team.');
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create User
    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      phone,
      team,
      role,
      status: UserStatus.PENDING, // Always starts pending approval
    });

    await this.userRepository.save(user);

    const approvalRequest = this.approvalRepository.create({
      requester: user,
      requestedRole: role,
      status: ApprovalStatus.PENDING,
    });
    
    await this.approvalRepository.save(approvalRequest);
    
    return { message: 'Registration request submitted. Awaiting approval from your team leader.' };
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    // 1. Find User with Password included
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.team', 'team')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 2. Check Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 3. Validate Status
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('Your account is pending approval.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended.');
    }

    // 4. Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      teamId: user.team?.id || null,
      roleId: user.role?.id || null,
      level: user.role?.level ?? 99, // Fallback high level for no role safety
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async getPublicTeams(): Promise<Team[]> {
    return this.teamRepository.find({
      select: ['id', 'name'],
    });
  }

  async getPublicRoles(teamId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { team: { id: teamId } },
      select: ['id', 'name', 'level'],
    });
  }
}
