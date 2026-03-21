import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const adminRole = await this.seedAdminRole();
    if (adminRole) {
      await this.seedAdminUser(adminRole);
    }
    await this.patchTeamLeads();
  }

  private async seedAdminRole(): Promise<Role> {
    let adminRole = await this.roleRepository.findOne({ where: { level: 0 } });
    
    if (!adminRole) {
      adminRole = this.roleRepository.create({
        name: 'Global Admin',
        level: 0,
        permissions: ['ALL_ACCESS'],
      });
      await this.roleRepository.save(adminRole);
      console.log('✅ Global Admin role seeded successfully.');
    }
    return adminRole;
  }

  private async seedAdminUser(adminRole: Role) {
    const adminUser = await this.userRepository.findOne({ where: { email: 'admin@taskflow.com' } });
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const user = this.userRepository.create({
        name: 'System Admin',
        email: 'admin@taskflow.com',
        password: hashedPassword,
        status: 'ACTIVE' as any,
        role: adminRole,
      });
      await this.userRepository.save(user);
      console.log('✅ Default Admin User seeded: admin@taskflow.com / admin123');
    }
  }

  private async patchTeamLeads() {
    const roles = await this.roleRepository.find({ where: { name: 'Team Lead' } });
    for (const role of roles) {
      if (!role.permissions.includes('MANAGE_USERS')) {
         role.permissions.push('MANAGE_USERS');
         await this.roleRepository.save(role);
         console.log(`✅ Patched Team Lead role with MANAGE_USERS for team setup.`);
      }
    }
  }
}
