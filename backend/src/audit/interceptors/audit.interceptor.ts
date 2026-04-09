import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly eventEmitter: EventEmitter2
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

        // Performance: Emit a decoupled background event instead of blocking the request thread
        this.eventEmitter.emit('audit.log', {
          actionType: `${method} ${url}`,
          targetEntity: url,
          details: safeBody,
          actor: { id: user.userId },
          team: user.teamId ? { id: user.teamId } : null,
        });
      }),
    );
  }
}
