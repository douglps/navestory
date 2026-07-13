import { Module } from "@nestjs/common";
import { AdminSupabaseService } from "./admin-supabase.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminSupabaseService],
})
export class AdminModule {}
