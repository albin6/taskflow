import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();
      message = typeof res === 'string' ? res : res.message || message;
      code = res.error || 'BAD_REQUEST';
    } else {
      // Log non-HTTP exceptions (Internal Errors) with stack trace
      this.logger.error(
        `[${request.method}] ${request.url} - Error: ${
          exception instanceof Error ? exception.message : 'Unknown error'
        }`,
        exception instanceof Error ? exception.stack : '',
      );
    }

    // In non-production, you might want more detail, but for now we follow the user's request for generic errors
    // but we still want to show the specific message if it's a known exception (e.g. Validation error)
    
    response.status(status).json({
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
