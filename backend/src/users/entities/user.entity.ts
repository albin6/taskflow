import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Role } from '../../roles/entities/role.entity';
import { UserStatus } from '../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ select: false }) // Exclude password from default SELECT queries
  password: string;

  @Column({ type: 'varchar', length: 20, default: UserStatus.PENDING })
  status: UserStatus;

  @Index()
  @ManyToOne(() => Team, team => team.users, { nullable: true, onDelete: 'SET NULL' })
  team: Team; // Null for independent or global users until assigned

  @Index()
  @ManyToOne(() => Role, role => role.users, { nullable: true, onDelete: 'SET NULL' })
  role: Role; // Null initially for onboarding request approvals

  @Column({ type: 'varchar', nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetPasswordExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
