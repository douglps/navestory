import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { SentryModule } from "@sentry/nestjs/setup";
import { envValidationSchema } from "./common/config/env.validation";
import { LoggerModule } from "./common/logging/logger.module";
import { HealthModule } from "./health/health.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { FleetSettingsModule } from "./modules/fleet-settings/fleet-settings.module";
import { FinesModule } from "./modules/fines/fines.module";
import { MaintenancesModule } from "./modules/maintenances/maintenances.module";
import { OdometerCyclesModule } from "./modules/odometer-cycles/odometer-cycles.module";
import { PreferencesModule } from "./modules/preferences/preferences.module";
import { RecurringCostsModule } from "./modules/recurring-costs/recurring-costs.module";
import { UsersModule } from "./modules/users/users.module";
import { VehicleGroupsModule } from "./modules/vehicle-groups/vehicle-groups.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";
import { AuditModule } from "./shared/audit/audit.module";
import { SupabaseAdminModule } from "./shared/supabase/supabase-admin.module";
import { SupabaseModule } from "./shared/supabase/supabase.module";

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    LoggerModule,
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
    CategoriesModule,
    ExpensesModule,
    FinesModule,
    MaintenancesModule,
    OdometerCyclesModule,
    PreferencesModule,
    DashboardModule,
    RecurringCostsModule,
    AnalyticsModule,
    AuditLogsModule,
    WorkspacesModule,
    FleetSettingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
