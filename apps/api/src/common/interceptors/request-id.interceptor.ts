import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import type { Request, Response } from "express";
import type { Observable } from "rxjs";

/**
 * @spec SPEC-20260716-002 RF-13
 * Propaga o requestId gerado pelo pino-http (RF-08) no header de resposta e como
 * tag do Sentry, para correlação entre logs, respostas HTTP e eventos de erro.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { id?: string }>();
    const response = httpContext.getResponse<Response>();

    if (request.id) {
      response.setHeader("X-Request-Id", request.id);
      Sentry.setTag("requestId", request.id);
    }

    return next.handle();
  }
}
