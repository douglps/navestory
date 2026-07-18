import { ArgumentsHost, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { HttpExceptionFilter } from "./http-exception.filter";

jest.mock("@sentry/nestjs", () => ({ captureException: jest.fn() }));

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
    jest.clearAllMocks();
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

  it("RF-03: não captura no Sentry uma HttpException 4xx", () => {
    const filter = new HttpExceptionFilter();
    const { host } = createHost();

    filter.catch(new BadRequestException("email inválido"), host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("RF-03: captura no Sentry uma HttpException 5xx", () => {
    const filter = new HttpExceptionFilter();
    const { host } = createHost();
    const exception = new InternalServerErrorException("falha ao processar");

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
  });

  it("RF-03: captura no Sentry uma exceção não-HTTP", () => {
    const filter = new HttpExceptionFilter();
    const { host } = createHost();
    const exception = new Error("falha inesperada");

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
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
