import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { envValidationSchema } from "./common/config/env.validation";
import { HealthModule } from "./health/health.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { VehicleGroupsModule } from "./modules/vehicle-groups/vehicle-groups.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
import { AuditModule } from "./shared/audit/audit.module";
import { SupabaseAdminModule } from "./shared/supabase/supabase-admin.module";
import { SupabaseModule } from "./shared/supabase/supabase.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    SupabaseModule,
    SupabaseAdminModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AdminModule,
    VehiclesModule,
    VehicleGroupsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
