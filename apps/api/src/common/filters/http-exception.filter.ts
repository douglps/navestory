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
    if (isHttpException) {
      const exceptionResponse = exception.getResponse();
      const rawMessage =
        typeof exceptionResponse === "string"
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ??
            exception.message);
      message = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;
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
    };

    response.status(statusCode).json(body);
  }
}
