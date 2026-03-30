import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { ReorderRolesDto } from './dto/reorder-roles.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { permissions, teamId } = createRoleDto;
    const name = createRoleDto.name.trim();

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team with ID "${teamId}" not found.`);
    }

    // 1. Check for name duplicates in THIS team only (Case-Insensitive)
    const existing = await this.roleRepository
      .createQueryBuilder('role')
      .where('LOWER(role.name) = LOWER(:name)', { name })
      .andWhere('role.teamId = :teamId', { teamId })
      .getOne();

    if (existing) {
      throw new ConflictException(`Role with name "${name}" already exists in this team.`);
    }

    // 2. Automatically calculate the next hierarchical Level
    // Query maximum level in this team to append at the bottom (highest number)
    const maxLevelResult = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.teamId = :teamId', { teamId })
      .select('MAX(role.level)', 'max')
      .getRawOne();
      
    const maxLevel = maxLevelResult?.max ?? 2; // Default starting point if no roles (unlikely due to seed)
    const newLevel = maxLevel + 1; // Append below Lead (2)

    const role = this.roleRepository.create({
      name,
      permissions: permissions || [],
      level: newLevel,
      team,
    });

    return this.roleRepository.save(role);
  }

  async findByTeam(teamId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { team: { id: teamId } },
      order: { level: 'ASC' }, // Strict hierarchy visualization
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id }, relations: ['team'] });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found.`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    // Normalize and Validations for Rename
    if (updateRoleDto.name) {
       const trimmedName = updateRoleDto.name.trim();
       
       // Check for absolute duplication
       const existing = await this.roleRepository
          .createQueryBuilder('role')
          .where('LOWER(role.name) = LOWER(:name)', { name: trimmedName })
          .andWhere('role.teamId = :teamId', { teamId: role.team?.id || null }) // Support global roles? (They have team=null)
          .andWhere('role.id != :id', { id })
          .getOne();

       if (existing) {
          throw new ConflictException(`Role with name "${trimmedName}" already exists in this team.`);
       }

       role.name = trimmedName;
    }

    if (updateRoleDto.permissions) role.permissions = updateRoleDto.permissions;

    return this.roleRepository.save(role);
  }

  async remove(id: string): Promise<{ message: string }> {
    const role = await this.findOne(id);

    if (role.level <= 2) {
      throw new ForbiddenException('Structural roles (Admin, Head, Lead) cannot be deleted.');
    }

    await this.roleRepository.remove(role);
    return { message: `Role "${role.name}" deleted successfully.` };
  }

  async reorder(teamId: string, reorderRolesDto: ReorderRolesDto) {
    const { roles } = reorderRolesDto;
    const roleIds = roles.map(r => r.id);

    // 1. Fetch target roles to verify ownership and level levels
    const existingRoles = await this.roleRepository.find({
      where: { id: In(roleIds), team: { id: teamId } },
    });

    if (existingRoles.length !== roles.length) {
      throw new NotFoundException('Some role IDs were missing or do not belong to this team.');
    }

    // 2. Verify no absolute anchor tampering
    for (const role of existingRoles) {
      if (role.level <= 2) {
        throw new ForbiddenException(`Anchor roles like "${role.name}" (Level ${role.level}) cannot be reordered.`);
      }
    }

    // 3. Batch Save reordered levels
    for (const item of roles) {
      const role = existingRoles.find(r => r.id === item.id);
      if (role) {
        role.level = item.level;
      }
    }

    await this.roleRepository.save(existingRoles);
    
    return { message: 'Role order updated successfully.' };
  }
}
