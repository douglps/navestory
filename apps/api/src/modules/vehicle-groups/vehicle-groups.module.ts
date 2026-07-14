import { Module } from "@nestjs/common";
import { VehicleGroupsController } from "./vehicle-groups.controller";
import { VehicleGroupsService } from "./vehicle-groups.service";

@Module({
  controllers: [VehicleGroupsController],
  providers: [VehicleGroupsService],
})
export class VehicleGroupsModule {}
