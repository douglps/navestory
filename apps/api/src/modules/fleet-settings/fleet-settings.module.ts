import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { FleetSettingsController } from "./fleet-settings.controller";
import { FleetSettingsService } from "./fleet-settings.service";

@Module({
  imports: [WorkspacesModule],
  controllers: [FleetSettingsController],
  providers: [FleetSettingsService],
})
export class FleetSettingsModule {}
