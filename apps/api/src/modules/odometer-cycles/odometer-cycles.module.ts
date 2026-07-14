import { Module } from "@nestjs/common";
import { VehiclesModule } from "../vehicles/vehicles.module";
import { OdometerCyclesController } from "./odometer-cycles.controller";
import { OdometerCyclesService } from "./odometer-cycles.service";

@Module({
  imports: [VehiclesModule],
  controllers: [OdometerCyclesController],
  providers: [OdometerCyclesService],
  exports: [OdometerCyclesService],
})
export class OdometerCyclesModule {}
