import { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";

/**
 * @spec specs/TESTS_SPEC.md CT-006 — roda contra Supabase local real (supabase start),
 * nunca mocka o guard/estratégia JWT.
 */
describe("Auth (integração, Supabase local)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("CT-006: GET /users/me sem JWT retorna 401 (S1)", async () => {
    await request(app.getHttpServer()).get("/users/me").expect(401);
  });

  it("CT-006: GET /users/me com JWT malformado retorna 401", async () => {
    await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", "Bearer token-invalido")
      .expect(401);
  });

  it("registra e faz login de um usuário real contra o Supabase local (STORY-REG-01, STORY-01)", async () => {
    const email = `test-${Date.now()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ name: "Teste Integração", email, password: "abc12!" })
      .expect(201);

    expect(registerResponse.body.data.message).toBe("Conta criada com sucesso");
    expect(registerResponse.headers["set-cookie"]).toBeDefined();

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "abc12!" })
      .expect(200);
  });

  it("bloqueia registro duplicado com 409 (STORY-REG-01)", async () => {
    const email = `test-dup-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ name: "Teste", email, password: "abc12!" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ name: "Teste", email, password: "abc12!" })
      .expect(409);
  });
});
