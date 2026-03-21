import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    const methodsToLog = ['POST', 'PATCH', 'DELETE', 'PUT'];
    if (!methodsToLog.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        if (!user) return;

        const safeBody = { ...body };
        if (safeBody.password) delete safeBody.password;

        const log = this.auditLogRepository.create({
          actionType: `${method} ${url}`,
          targetEntity: url,
          details: safeBody,
          actor: { id: user.userId } as any,
          team: user.teamId ? { id: user.teamId } as any : null,
        });

        this.auditLogRepository.save(log).catch(err => {
          console.error('AuditInterceptor Failed to save log:', err);
        });
      }),
    );
  }
}
