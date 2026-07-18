import "./instrument";
import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { RequestIdInterceptor } from "./common/interceptors/request-id.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const nodeEnv = configService.get<string>("NODE_ENV");
  const swaggerEnabled = configService.get<boolean>("SWAGGER_ENABLED");
  if (nodeEnv === "development" || swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle("Nave API")
      .setDescription("API de gestão de frota veicular")
      .setVersion("0.0.0")
      .addBearerAuth()
      .addTag("auth")
      .addTag("users")
      .addTag("admin")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = configService.get<number>("PORT") ?? 3001;
  await app.listen(port);
  app.get(Logger).log(`API rodando na porta ${port}`, "Bootstrap");
}

void bootstrap();
