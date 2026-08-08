import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { Request, Response } from "express";
import {
  LOGIN_THROTTLE_LIMIT,
  LOGIN_THROTTLE_TTL_MS,
} from "../../modules/auth/auth.constants";

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
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // @spec SPEC-20260807-002 RF-B02 — valida S16
    if (statusCode === HttpStatus.TOO_MANY_REQUESTS && request.path === "/auth/login") {
      Sentry.captureMessage("Rate limit de login atingido: possível força bruta", {
        level: "warning",
        tags: { security_event: true, scenario: "brute_force_login" },
        extra: {
          ip: request.ip,
          endpoint: "/auth/login",
          throttle_limit: LOGIN_THROTTLE_LIMIT,
          window_ms: LOGIN_THROTTLE_TTL_MS,
        },
      });
    }

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

    // @spec SPEC-20260716-002 RF-03 — captura/loga qualquer 5xx (HttpException intencional ou
    // não) e qualquer exceção não-HTTP; 4xx não são bugs e não passam por aqui. Sem essa checagem
    // por status, um 500 lançado via HttpException (ex: InternalServerErrorException) nunca era
    // logado nem reportado ao Sentry — só aparecia no corpo da resposta HTTP.
    const isServerError = !isHttpException || statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;
    if (isServerError) {
      Sentry.captureException(exception);
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
