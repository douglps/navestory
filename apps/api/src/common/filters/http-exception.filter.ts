import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { Response } from "express";

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  timestamp: string;
  code?: string;
  deleted_at?: string;
}

/**
 * @spec SPEC-20260521-001 RF-SEC-003
 * Nunca expõe stack trace, SQL ou schema em produção — apenas statusCode/message/timestamp.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === "production";
    const genericMessage = "Erro interno do servidor";

    let message: string;
    let code: string | undefined;
    let deletedAt: string | undefined;
    if (isHttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else {
        /**
         * @spec SPEC-20260719-002 RF-09
         * `code`/`deleted_at` são um contrato explícito e restrito (whitelist), não um
         * passthrough genérico do payload da exceção — evita vazar campos não previstos de
         * outras exceções que também usem `getResponse()` com objeto.
         */
        const typedResponse = exceptionResponse as {
          message?: string | string[];
          code?: string;
          deleted_at?: string;
        };
        const rawMessage = typedResponse.message ?? exception.message;
        message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;
        code = typedResponse.code;
        deletedAt = typedResponse.deleted_at;
      }
    } else {
      message = isProduction ? genericMessage : (exception as Error)?.message ?? genericMessage;
    }

    // @spec SPEC-20260716-002 RF-03 — captura 5xx e exceções não-HTTP; 4xx não são bugs
    const shouldCaptureInSentry = !isHttpException || statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;
    if (shouldCaptureInSentry) {
      Sentry.captureException(exception);
    }

    if (!isHttpException) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
        HttpExceptionFilter.name,
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      ...(code ? { code } : {}),
      ...(deletedAt ? { deleted_at: deletedAt } : {}),
    };

    response.status(statusCode).json(body);
  }
}
