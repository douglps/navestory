import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { PreferencesModule } from "../preferences/preferences.module";
import { MaintenancesController } from "./maintenances.controller";
import { MaintenancesService } from "./maintenances.service";

@Module({
  imports: [ExpensesModule, PreferencesModule],
  controllers: [MaintenancesController],
  providers: [MaintenancesService],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
