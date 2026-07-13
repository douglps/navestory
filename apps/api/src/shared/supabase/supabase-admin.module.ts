import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN_CLIENT } from "./supabase.constants";

/**
 * @spec SPEC-20260521-004 RF-05, CA-06
 * Client com SERVICE_ROLE_KEY — bypassa RLS. Uso restrito: rollback de registro (auth.service),
 * revogação de conta (users.service) e operações do módulo admin. Nunca injetar em serviços
 * que atendem diretamente requisições de usuários comuns sem esses fins específicos.
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN_CLIENT,
      useFactory: (configService: ConfigService) =>
        createClient(
          configService.getOrThrow<string>("SUPABASE_URL"),
          configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
          { auth: { autoRefreshToken: false, persistSession: false } },
        ),
      inject: [ConfigService],
    },
  ],
  exports: [SUPABASE_ADMIN_CLIENT],
})
export class SupabaseAdminModule {}
