import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { ApprovalStatus } from '../../common/enums';

@Entity('approval_requests')
export class ApprovalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  requester: User; // The new user registering

  @ManyToOne(() => Role, { onDelete: 'SET NULL' })
  requestedRole: Role; // The role they applied for

  @Column({ type: 'varchar', length: 20, default: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  approvedBy: User; // User who approved/rejected the request

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
