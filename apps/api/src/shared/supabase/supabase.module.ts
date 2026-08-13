import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet } from "jose";
import { SUPABASE_CLIENT, SUPABASE_JWKS } from "./supabase.constants";

/**
 * Client anon do Supabase, usado para operações de auth.* (signUp, signInWithPassword,
 * signOut, refreshSession, resetPasswordForEmail, updateUser) que não exigem service role.
 * Nunca usado para bypass de RLS — ver AdminSupabaseService para operações privilegiadas.
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: (configService: ConfigService) =>
        createClient(
          configService.getOrThrow<string>("SUPABASE_URL"),
          configService.getOrThrow<string>("SUPABASE_ANON_KEY"),
        ),
      inject: [ConfigService],
    },
    {
      /**
       * @spec SPEC-20260521-001 RULES.md S1
       * JWKS do GoTrue deste projeto (ES256, chave assimétrica rotacionável). `createRemoteJWKSet`
       * cacheia as chaves em memória e as renova sozinho quando o `kid` do token não bate com o
       * cache — usado por `SupabaseAuthGuard`/`SoftDeletedUserGuard` para validar a assinatura do
       * access token localmente em vez de round-trip a `auth.getUser()` em toda requisição
       * autenticada (achado de performance de Douglas em 2026-08-08).
       */
      provide: SUPABASE_JWKS,
      useFactory: (configService: ConfigService) => {
        const supabaseUrl = configService.getOrThrow<string>("SUPABASE_URL");
        return createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
      },
      inject: [ConfigService],
    },
  ],
  exports: [SUPABASE_CLIENT, SUPABASE_JWKS],
})
export class SupabaseModule {}
