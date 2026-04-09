import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - startTime;

        // Structured JSON Logging for P95/P99 analysis and observability
        const logData = {
          method,
          url,
          statusCode,
          durationMs: duration,
          userId: user?.userId || 'anonymous',
          teamId: user?.teamId || 'none',
        };

        // Non-blocking log to stdout
        this.logger.log(JSON.stringify(logData));
      }),
    );
  }
}
