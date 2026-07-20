import { AccountRestoreController } from "./account-restore.controller";
import type { UsersService } from "./users.service";

describe("AccountRestoreController", () => {
  it("restore chama usersService.restoreAccount e retorna mensagem de sucesso (RF-08)", async () => {
    const usersService = {
      restoreAccount: jest.fn().mockResolvedValue(undefined),
    } as unknown as UsersService;
    const controller = new AccountRestoreController(usersService);

    const result = await controller.restore("u1");

    expect(usersService.restoreAccount).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ message: "Conta restaurada com sucesso." });
  });
});
