import { Module } from "@nestjs/common";
import { AccountRestoreController } from "./account-restore.controller";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController, AccountRestoreController],
  providers: [UsersService],
})
export class UsersModule {}
