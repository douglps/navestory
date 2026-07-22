import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { MaintenancesModule } from "../maintenances/maintenances.module";
import { PreferencesModule } from "../preferences/preferences.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [ExpensesModule, MaintenancesModule, PreferencesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
