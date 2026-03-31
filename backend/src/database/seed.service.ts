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
    await this.patchRolePermissions();
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
      console.log('Global Admin role seeded successfully.');
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
      console.log('Default Admin User seeded: admin@taskflow.com / admin123');
    }
  }

  private async patchRolePermissions() {
    const roles = await this.roleRepository.find();
    
    const taskPermissions = ['VIEW_TASKS', 'CREATE_TASK', 'EDIT_TASK', 'DELETE_TASK', 'ASSIGN_TASK'];

    for (const role of roles) {
      if (role.level === 0) continue; // Skip System Admin

      let changed = false;

      // 1. Everyone (Level 1-5) should be able to VIEW_TASKS
      if (!role.permissions.includes('VIEW_TASKS')) {
        role.permissions.push('VIEW_TASKS');
        changed = true;
      }

      // 2. Managers (Heads and Leads, Level 1 and 2) should have ALL task permissions
      if (role.level >= 1 && role.level <= 2) {
        for (const p of taskPermissions) {
           if (!role.permissions.includes(p)) {
             role.permissions.push(p);
             changed = true;
           }
        }
        
        // Also ensure they can manage users
        if (!role.permissions.includes('MANAGE_USERS')) {
          role.permissions.push('MANAGE_USERS');
          changed = true;
        }
      }

      if (changed) {
        await this.roleRepository.save(role);
        console.log(`Patched permissions for role: ${role.name} (Level ${role.level})`);
      }
    }
  }
}
