import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';

export enum KpiMetricType {
  TASK_COMPLETION_RATE = 'TASK_COMPLETION_RATE',
  AVG_RESOLUTION_TIME_MS = 'AVG_RESOLUTION_TIME_MS',
  OVERDUE_TASK_COUNT = 'OVERDUE_TASK_COUNT',
  TOTAL_TASKS_ASSIGNED = 'TOTAL_TASKS_ASSIGNED',
}

@Entity('kpi_snapshots')
export class KpiSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user: User | null;

  @Index()
  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  team: Team | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  metricType: KpiMetricType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Index()
  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Flexible field for future AI-driven insights/context
}
