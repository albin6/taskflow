import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  level: number; // 0: Admin, 1: Head, 2: Lead, 3+: Custom

  @Column({ type: 'jsonb', default: [] })
  permissions: string[]; // ['CREATE_USER', 'DELETE_TASK', etc.]

  @ManyToOne(() => Team, team => team.roles, { nullable: true, onDelete: 'CASCADE' })
  team: Team; // Null for global admin roles, filled if team-scoped

  @OneToMany(() => User, user => user.role)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
