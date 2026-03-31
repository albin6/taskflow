import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';
import { RecurrenceFrequency, TaskPriority } from '../../common/enums';

@Entity('recurring_tasks')
export class RecurringTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'varchar', length: 20 })
  frequency: RecurrenceFrequency;

  @Column({ type: 'simple-array', nullable: true })
  daysOfWeek: string[]; // e.g. ["MONDAY", "WEDNESDAY"]

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastRunDate: Date | null;

  @Column({ type: 'timestamp' })
  nextRunDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  creator: User;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  team: Team;

  @ManyToMany(() => User)
  @JoinTable({ name: 'recurring_task_assignees' })
  assignees: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
