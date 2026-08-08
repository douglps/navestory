import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { extractSecurityContext } from "../../common/security/security-context";
import { AuthService, type AuthSession } from "./auth.service";
import { loginDtoSchema, type LoginDto } from "./dto/login.dto";
import {
  recoverPasswordDtoSchema,
  type RecoverPasswordDto,
} from "./dto/recover-password.dto";
import { registerDtoSchema, type RegisterDto } from "./dto/register.dto";
import {
  resetPasswordDtoSchema,
  type ResetPasswordDto,
} from "./dto/reset-password.dto";
import { LOGIN_THROTTLE_LIMIT, LOGIN_THROTTLE_TTL_MS } from "./auth.constants";

const REMEMBER_ME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @spec SPEC-20260524-001, SPEC-20260524-002
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @UsePipes(new ZodValidationPipe(registerDtoSchema))
  @ApiOperation({ summary: "Registrar nova conta" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "email", "password"],
      properties: {
        name: { type: "string", minLength: 2, example: "Ana Silva" },
        email: { type: "string", format: "email", example: "ana@example.com" },
        password: { type: "string", minLength: 6, example: "abc12!" },
        profile_type: {
          type: "string",
          enum: ["autonomous", "small_fleet", "large_fleet"],
          default: "autonomous",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Conta criada com sucesso" })
  @ApiResponse({
    status: 400,
    description: "Dados de cadastro inválidos (schema Zod)",
  })
  @ApiResponse({ status: 409, description: "E-mail já cadastrado" })
  @ApiResponse({
    status: 429,
    description: "Rate limit excedido (5 req/15min por IP)",
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: { message: string } }> {
    const session = await this.authService.register(dto, extractSecurityContext(req));
    this.setSessionCookies(res, session);
    return { data: { message: "Conta criada com sucesso" } };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: LOGIN_THROTTLE_LIMIT, ttl: LOGIN_THROTTLE_TTL_MS } })
  @UsePipes(new ZodValidationPipe(loginDtoSchema))
  @ApiOperation({ summary: "Login com e-mail e senha" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", example: "ana@example.com" },
        password: { type: "string", example: "abc12!" },
        rememberMe: { type: "boolean", default: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Login realizado com sucesso" })
  @ApiResponse({
    status: 401,
    description: "INVALID_CREDENTIALS (anti-enumeração)",
  })
  @ApiResponse({
    status: 403,
    description: "Conta bloqueada por excesso de tentativas",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit excedido (10 req/15min por IP)",
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: { message: string } }> {
    const session = await this.authService.login(dto, extractSecurityContext(req));
    this.setSessionCookies(res, session);
    return { data: { message: "Login realizado com sucesso" } };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Encerrar sessão" })
  @ApiResponse({ status: 204, description: "Sessão encerrada" })
  @ApiResponse({ status: 401, description: "JWT ausente ou inválido" })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const accessToken = req.cookies?.navestory_access_token as
      | string
      | undefined;
    if (accessToken) {
      await this.authService.logout(accessToken);
    }
    this.clearSessionCookies(res);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar sessão via refresh token" })
  @ApiResponse({ status: 200, description: "Sessão renovada" })
  @ApiResponse({
    status: 401,
    description: "Refresh token ausente ou inválido",
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: { message: string } }> {
    const refreshToken = req.cookies?.navestory_refresh_token as
      | string
      | undefined;
    const rememberMe = req.cookies?.navestory_remember_me === "true";
    if (!refreshToken) {
      this.clearSessionCookies(res);
      res.status(HttpStatus.UNAUTHORIZED);
      return { data: { message: "Sessão expirada" } };
    }

    const session = await this.authService.refresh(refreshToken, rememberMe);
    this.setSessionCookies(res, session);
    return { data: { message: "Sessão renovada" } };
  }

  @Post("recover-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @UsePipes(new ZodValidationPipe(recoverPasswordDtoSchema))
  @ApiOperation({ summary: "Solicitar redefinição de senha" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: { email: { type: "string", format: "email" } },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Sempre 200, mesmo que o e-mail não exista (anti-enumeração)",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit excedido (3 req/15min por IP)",
  })
  async recoverPassword(
    @Body() dto: RecoverPasswordDto,
  ): Promise<{ data: { message: string } }> {
    await this.authService.recoverPassword(dto);
    return {
      data: {
        message: "Se o e-mail existir, enviaremos instruções de redefinição",
      },
    };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordDtoSchema))
  @ApiOperation({ summary: "Redefinir senha via link de recuperação" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: { type: "string" },
        password: { type: "string", minLength: 6, example: "abc12!" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Senha redefinida com sucesso" })
  @ApiResponse({
    status: 401,
    description: "Link de redefinição inválido ou expirado",
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ data: { message: string } }> {
    await this.authService.resetPassword(dto);
    return { data: { message: "Senha redefinida com sucesso" } };
  }

  private setSessionCookies(res: Response, session: AuthSession): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    res.cookie("navestory_access_token", session.accessToken, {
      ...cookieOptions,
      maxAge: session.expiresIn * 1000,
    });
    res.cookie("navestory_refresh_token", session.refreshToken, {
      ...cookieOptions,
      ...(session.rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_MS } : {}),
    });
    res.cookie("navestory_remember_me", String(session.rememberMe), {
      ...cookieOptions,
      httpOnly: false,
      ...(session.rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE_MS } : {}),
    });
  }

  private clearSessionCookies(res: Response): void {
    res.clearCookie("navestory_access_token", { path: "/" });
    res.clearCookie("navestory_refresh_token", { path: "/" });
    res.clearCookie("navestory_remember_me", { path: "/" });
  }
}
