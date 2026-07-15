import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { MaintenancesController } from "./maintenances.controller";
import { MaintenancesService } from "./maintenances.service";

@Module({
  imports: [ExpensesModule],
  controllers: [MaintenancesController],
  providers: [MaintenancesService],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
