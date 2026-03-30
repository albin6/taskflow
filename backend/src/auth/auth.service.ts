import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Team } from '../teams/entities/team.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus, ApprovalStatus } from '../common/enums';
import { ApprovalRequest } from '../approvals/entities/approval-request.entity';
import { ApprovalsService } from '../approvals/approvals.service';
import { MailService } from '../mail/mail.service';

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
    private readonly approvalsService: ApprovalsService,
    private readonly mailService: MailService,
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

    const approval = await this.approvalsService.createApprovalRequest(user, role);
    
    return { 
      message: `Registration request submitted. Awaiting approval from ${approval.assignedApproverRoleName}.` 
    };
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // For security, don't reveal that the user doesn't exist
      return { message: 'If an account exists with this email, you will receive reset instructions shortly.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.save(user);
    await this.mailService.sendResetPasswordEmail(user.email, token);

    return { message: 'If an account exists with this email, you will receive reset instructions shortly.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordToken')
      .addSelect('user.resetPasswordExpires')
      .where('user.resetPasswordToken = :token', { token })
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired.');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepository.save(user);

    return { message: 'Password has been reset successfully. You can now log in.' };
  }
}
