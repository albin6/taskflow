import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';
import { TaskStatus, TaskPriority } from '../../common/enums';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'varchar', length: 20, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date | null;

  @Index()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  assignee: User | null; // User assigned to do the task

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  assigner: User | null; // User who assigned it

  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  creator: User; // User who created it

  @Index()
  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  team: Team; // Scoped directly inside team boundaries

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
