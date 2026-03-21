import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { Permissions } from '../common/constants/permissions';
import { UserStatus } from '../common/enums';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    const { name } = createTeamDto;

    const existing = await this.teamRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Team with name "${name}" already exists.`);
    }

    const team = this.teamRepository.create({ name });
    const savedTeam = await this.teamRepository.save(team);

    // Auto-create permanent Head and Lead roles for the team
    const headRole = this.roleRepository.create({
      name: 'Team Head',
      level: 1,
      team: savedTeam,
      permissions: [
        Permissions.MANAGE_USERS,
        Permissions.APPROVE_REGISTRATIONS,
        Permissions.MANAGE_ROLES,
        Permissions.REORDER_ROLES,
        Permissions.VIEW_TEAM_AUDIT,
        Permissions.CREATE_TASK,
        Permissions.EDIT_TASK,
        Permissions.DELETE_TASK,
        Permissions.ASSIGN_TASK,
      ],
    });

    const leadRole = this.roleRepository.create({
      name: 'Team Lead',
      level: 2,
      team: savedTeam,
      permissions: [
        Permissions.MANAGE_USERS,
        Permissions.MANAGE_ROLES,
        Permissions.REORDER_ROLES,
        Permissions.CREATE_TASK,
        Permissions.EDIT_TASK,
        Permissions.DELETE_TASK,
        Permissions.ASSIGN_TASK,
      ],
    });

    await this.roleRepository.save([headRole, leadRole]);

    return savedTeam;
  }

  async findAll(): Promise<Team[]> {
    return this.teamRepository.find({ relations: ['roles'] });
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { id }, relations: ['roles', 'users'] });
    if (!team) {
      throw new NotFoundException(`Team with ID "${id}" not found.`);
    }
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);
    team.name = updateTeamDto.name;
    return this.teamRepository.save(team);
  }

  async remove(id: string): Promise<{ message: string }> {
    const team = await this.findOne(id);
    await this.teamRepository.remove(team);
    return { message: `Team "${team.name}" deleted successfully.` };
  }

  async assignHead(teamId: string, userId: string): Promise<{ message: string }> {
    return this.assignRoleToUser(teamId, userId, 1, 'Team Head');
  }

  async assignLead(teamId: string, userId: string): Promise<{ message: string }> {
    return this.assignRoleToUser(teamId, userId, 2, 'Team Lead');
  }

  private async assignRoleToUser(teamId: string, userId: string, level: number, roleName: string) {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Team not found');

    const role = await this.roleRepository.findOne({
      where: { team: { id: teamId }, level: level },
    });

    if (!role) {
      throw new NotFoundException(`Permanent role "${roleName}" not found for this team.`);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    // Set User's team and role
    user.team = team;
    user.role = role;
    user.status = UserStatus.ACTIVE; // Actively assigned by Admin

    await this.userRepository.save(user);

    return { message: `User "${user.name}" successfully assigned as ${roleName} of ${team.name}.` };
  }
}
