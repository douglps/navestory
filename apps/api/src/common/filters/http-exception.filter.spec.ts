import { ArgumentsHost, BadRequestException } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

function createHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe("HttpExceptionFilter", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("retorna statusCode e message de uma HttpException", () => {
    const filter = new HttpExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new BadRequestException("email inválido"), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: "email inválido" }),
    );
  });

  it("oculta detalhe de erro genérico em produção (S5)", () => {
    process.env.NODE_ENV = "production";
    const filter = new HttpExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new Error("stack trace sensível com SQL"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: "Erro interno do servidor" }),
    );
  });

  it("expõe a mensagem original de erro genérico em desenvolvimento", () => {
    process.env.NODE_ENV = "development";
    const filter = new HttpExceptionFilter();
    const { host, json } = createHost();

    filter.catch(new Error("detalhe de debug"), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: "detalhe de debug" }));
  });
});
