import { Module } from "@nestjs/common";
import { ExpensesModule } from "../expenses/expenses.module";
import { FinesController } from "./fines.controller";
import { FinesService } from "./fines.service";

@Module({
  imports: [ExpensesModule],
  controllers: [FinesController],
  providers: [FinesService],
  exports: [FinesService],
})
export class FinesModule {}
