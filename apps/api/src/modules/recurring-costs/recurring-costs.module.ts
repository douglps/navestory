import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { RecurringCostsController } from "./recurring-costs.controller";
import { RecurringCostsService } from "./recurring-costs.service";

@Module({
  imports: [ExpensesModule],
  controllers: [RecurringCostsController],
  providers: [RecurringCostsService],
})
export class RecurringCostsModule {}
