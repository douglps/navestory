import { Module } from "@nestjs/common";
import { WorkspaceAdminSupabaseService } from "./services/workspace-admin-supabase.service";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceAdminSupabaseService],
  exports: [WorkspaceAdminSupabaseService],
})
export class WorkspacesModule {}
