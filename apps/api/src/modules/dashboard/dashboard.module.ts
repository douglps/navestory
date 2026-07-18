import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { MaintenancesModule } from "../maintenances/maintenances.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [ExpensesModule, MaintenancesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
