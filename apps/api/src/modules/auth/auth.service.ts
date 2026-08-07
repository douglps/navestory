import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN_CLIENT, SUPABASE_CLIENT } from "../../shared/supabase/supabase.constants";
import { AuditService } from "../../shared/audit/audit.service";
import type { LoginDto } from "./dto/login.dto";
import type { RecoverPasswordDto } from "./dto/recover-password.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  rememberMe: boolean;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * @spec SPEC-20260524-001, SPEC-20260524-002
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabaseAdmin: SupabaseClient,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @spec SPEC-20260524-001 STORY-REG-01
   */
  async register(dto: RegisterDto): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: {
          full_name: dto.name,
          profile_type: dto.profile_type,
        },
      },
    });

    if (error) {
      if (error.status === 422 || /already registered|already exists/i.test(error.message)) {
        throw new ConflictException("E-mail já cadastrado");
      }
      throw new InternalServerErrorException(error.message);
    }

    if (!data.user || !data.session) {
      throw new InternalServerErrorException("Falha ao criar conta");
    }

    const profile = await this.findProfileWithRetry(data.user.id);

    if (!profile) {
      await this.supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw new InternalServerErrorException("Falha ao criar perfil da conta");
    }

    void this.auditService.log({
      userId: data.user.id,
      action: "REGISTER",
      tableName: "auth",
      recordId: data.user.id,
    });

    return this.toAuthSession(data.session, false);
  }

  /**
   * @spec SPEC-20260524-001 STORY-01, STORY-02, STORY-03
   */
  async login(dto: LoginDto): Promise<AuthSession> {
    const attempt = await this.getLoginAttempt(dto.email);
    if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
      throw new ForbiddenException(
        "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.",
      );
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      await this.registerFailedAttempt(dto.email, attempt?.failed_count ?? 0);
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    await this.resetLoginAttempts(dto.email);

    void this.auditService.log({
      userId: data.user.id,
      action: "LOGIN",
      tableName: "auth",
      recordId: data.user.id,
    });

    return this.toAuthSession(data.session, dto.rememberMe);
  }

  /**
   * @spec SPEC-20260521-001 RF-SEC-002 (revogação via admin API)
   */
  async logout(accessToken: string): Promise<void> {
    await this.supabaseAdmin.auth.admin.signOut(accessToken, "global");
  }

  async refresh(refreshToken: string, rememberMe: boolean): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException("Sessão expirada");
    }

    return this.toAuthSession(data.session, rememberMe);
  }

  /**
   * @spec SPEC-20260524-001 STORY-04 — sempre resolve, nunca revela se o e-mail existe.
   */
  async recoverPassword(dto: RecoverPasswordDto): Promise<void> {
    try {
      const webAppUrl = this.configService.getOrThrow<string>("WEB_APP_URL");
      await this.supabase.auth.resetPasswordForEmail(dto.email, {
        redirectTo: `${webAppUrl}/reset-password`,
      });
    } catch {
      // Anti-enumeração: falha silenciosa, resposta ao cliente é sempre 200 genérico.
    }
  }

  /**
   * @spec SPEC-20260524-001 STORY-05
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token_hash: dto.token,
      type: "recovery",
    });

    if (error || !data.session) {
      throw new UnauthorizedException("Link de redefinição inválido ou expirado");
    }

    const { error: updateError } = await this.supabase.auth.updateUser({
      password: dto.password,
    });

    if (updateError) {
      throw new InternalServerErrorException(updateError.message);
    }
  }

  /**
   * @spec SPEC-20260524-001 STORY-REG-01
   * `handle_new_user` insere o profile na mesma transação do INSERT em auth.users feito pelo
   * GoTrue, mas a leitura seguinte via PostgREST é uma requisição HTTP separada — retries curtos
   * absorvem uma eventual janela de lag de visibilidade sem mascarar uma falha real da trigger
   * (que continuaria retornando null após todas as tentativas). Erro de query (ex: credencial
   * inválida) não é lag — é reportado imediatamente, sem retry, para não esconder a causa real.
   */
  private async findProfileWithRetry(
    userId: string,
    attempts = 3,
    delayMs = 150,
  ): Promise<{ id: string } | null> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const { data: profile, error } = await this.supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        return profile;
      }

      // Erro de query (ex: chave/permissão inválida) não é "lag de leitura" — retry não resolve
      // e mascarar como "perfil não encontrado" esconde a causa real. Falha alto e imediatamente.
      if (error) {
        throw new InternalServerErrorException(`Falha ao consultar perfil da conta: ${error.message}`);
      }

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return null;
  }

  private toAuthSession(
    session: { access_token: string; refresh_token: string; expires_in: number },
    rememberMe: boolean,
  ): AuthSession {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      rememberMe,
    };
  }

  private async getLoginAttempt(
    email: string,
  ): Promise<{ failed_count: number; locked_until: string | null } | null> {
    const { data } = await this.supabaseAdmin
      .from("auth_login_attempts")
      .select("failed_count, locked_until")
      .eq("email", email)
      .maybeSingle();
    return data;
  }

  /**
   * @spec SPEC-20260524-001 §4.3
   */
  private async registerFailedAttempt(email: string, currentCount: number): Promise<void> {
    const failedCount = currentCount + 1;
    const lockedUntil =
      failedCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null;

    await this.supabaseAdmin.from("auth_login_attempts").upsert({
      email,
      failed_count: failedCount,
      locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    });
  }

  private async resetLoginAttempts(email: string): Promise<void> {
    await this.supabaseAdmin.from("auth_login_attempts").delete().eq("email", email);
  }
}
