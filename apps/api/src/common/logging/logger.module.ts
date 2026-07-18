import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { LoggerModule as PinoLoggerModule, type Params } from "nestjs-pino";
import type { JwtPayload } from "../../modules/auth/jwt.strategy";
import { PINO_REDACT_PATHS, redactSensitiveKeys } from "./redact-paths";

type AuthenticatedRequest = Request & { user?: JwtPayload };

/**
 * @spec SPEC-20260716-002 RF-08, RF-09, RF-10, RF-11, RF-13
 * Substitui o logger padrão do NestJS por Pino estruturado (nestjs-pino + pino-http).
 */
export const LoggerModule = PinoLoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Params => {
    const isProduction = configService.get<string>("NODE_ENV") === "production";

    return {
      pinoHttp: {
        genReqId: (req) => req.headers["x-request-id"]?.toString() ?? randomUUID(),
        customAttributeKeys: {
          reqId: "requestId",
          responseTime: "responseTimeMs",
        },
        customProps: (req) => ({ userId: (req as AuthenticatedRequest).user?.sub }),
        redact: { paths: PINO_REDACT_PATHS, censor: "[REDACTED]" },
        formatters: {
          log: (object: Record<string, unknown>) => redactSensitiveKeys(object),
        },
        transport: isProduction ? undefined : { target: "pino-pretty" },
      },
    };
  },
});
