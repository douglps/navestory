import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "./supabase.constants";

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
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
