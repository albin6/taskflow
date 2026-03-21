import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  actor: User; // Who did it (e.g., actor.id)

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  team: Team; // Null for global audits, filled if scoped to a team

  @Column()
  actionType: string; // e.g., 'USER_REGISTERED', 'ROLE_UPDATED'

  @Column()
  targetEntity: string; // e.g., 'User', 'Role', 'Task'

  @Column({ type: 'jsonb', default: {} })
  details: any; // Raw comparison or event detail values

  @CreateDateColumn()
  timestamp: Date;
}
