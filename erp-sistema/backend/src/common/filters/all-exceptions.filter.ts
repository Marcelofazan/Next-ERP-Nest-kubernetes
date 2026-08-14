import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';
import { RequestWithId } from '../types/request-with-id';

interface DbError extends Error {
  code?: string;
  errno?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId ?? 'unknown';

    const { status, message } = this.resolve(exception);

    // Log detalhado apenas no servidor
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} → ${status}: ${message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolve(exception: unknown): { status: number; message: string } {
    // Exceções HTTP do NestJS (validações, guards, etc.)
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as any)?.message ?? exception.message);
      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join('; ') : message,
      };
    }

    // Erros do TypeORM — traduzir para HTTP limpo sem expor detalhes internos
    if (exception instanceof QueryFailedError) {
      const err = exception as DbError;
      const code = err.code ?? String(err.errno ?? '');

      // PostgreSQL: 23505 = unique_violation, 23503 = foreign_key_violation, 23502 = not_null
      // SQLite:  SQLITE_CONSTRAINT (errno 19)
      if (
        code === '23505' ||
        (code.includes('SQLITE_CONSTRAINT') && err.message.includes('UNIQUE'))
      ) {
        return {
          status: HttpStatus.CONFLICT,
          message: 'O registro já existe (chave duplicada).',
        };
      }
      if (
        code === '23503' ||
        (code.includes('SQLITE_CONSTRAINT') &&
          err.message.includes('FOREIGN KEY'))
      ) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referência para um registro que não existe.',
        };
      }
      if (code === '23502') {
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Campos obrigatórios ausentes.',
        };
      }
      // Qualquer outro erro de banco de dados → 500 genérico sem detalhes
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor.',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor.',
    };
  }
}