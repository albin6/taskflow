import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user-management.dto';
import { UserStatus } from '../common/enums';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { name, email, password, phone, teamId, roleId } = createUserDto;

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists.');
    }

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team with ID "${teamId}" not found.`);
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId }, relations: ['team'] });
    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found.`);
    }

    if (role.team && role.team.id !== teamId) {
      throw new ConflictException('The selected role does not belong to the selected team.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      phone,
      team,
      role,
      status: createUserDto.status || UserStatus.ACTIVE, // Respect provided status or default to ACTIVE
    });

    return this.userRepository.save(user);
  }

  async findAll(actor: any, queryDto?: UserQueryDto, filterActiveOnly: boolean = false): Promise<any> {
    const { search, sortBy = 'name', sortOrder = 'ASC', status, page = 1, limit = 10, teamId } = queryDto || {};

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .leftJoinAndSelect('user.role', 'role');

    // Admin level 0 views ALL by default, unless teamId is provided.
    // Level 1+ views absolute team scopes.
    if (actor.level !== 0 && actor.teamId) {
      query.where('team.id = :actorTeamId', { actorTeamId: actor.teamId });
    } else if (teamId) {
      query.where('team.id = :targetTeamId', { targetTeamId: teamId });
    }

    if (filterActiveOnly) {
      query.andWhere('user.status = :activeStatus', { activeStatus: UserStatus.ACTIVE });
    } else if (status) {
      query.andWhere('user.status = :status', { status });
    }

    if (search) {
      query.andWhere('(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))', {
        search: `%${search}%`,
      });
    }

    if (queryDto?.permission) {
      query.andWhere('role.permissions @> :permission', {
        permission: JSON.stringify([queryDto.permission]),
      });
    }

    // Sorting
    const allowedSortFields = ['name', 'email', 'status', 'createdAt', 'role.name'];
    const actualSortField = allowedSortFields.includes(sortBy) ? (sortBy.includes('.') ? sortBy : `user.${sortBy}`) : 'user.name';
    query.orderBy(actualSortField, sortOrder as 'ASC' | 'DESC');

    // Pagination - only if queryDto is provided (legacy roster endpoint won't paginate)
    if (queryDto) {
      const skip = (page - 1) * limit;
      const [data, total] = await query
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team', 'role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.phone) user.phone = updateUserDto.phone;
    if (updateUserDto.status) user.status = updateUserDto.status;

    if (updateUserDto.roleId) {
      const role = await this.roleRepository.findOne({ where: { id: updateUserDto.roleId }, relations: ['team'] });
      if (!role) {
        throw new NotFoundException(`Role with ID "${updateUserDto.roleId}" not found.`);
      }

      // Safety: check if updating role respects team boundary (user already has team attached)
      if (role.team && user.team && role.team.id !== user.team.id) {
        throw new ConflictException('Target role does not belong to user\'s team.');
      }
      user.role = role;
    }

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);

    // Safety: Cannot delete Level 0 directly from endpoint generally without protection?
    if (user.role?.level === 0) {
      throw new ForbiddenException('Root Administrator account cannot be deleted.');
    }

    await this.userRepository.remove(user);
    return { message: `User "${user.name}" deleted successfully.` };
  }
}
