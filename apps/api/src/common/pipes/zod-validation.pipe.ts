import { BadRequestException, type ArgumentMetadata, type PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Usado de duas formas: a nível de método (`@UsePipes(new ZodValidationPipe(schema))`, valida
 * o `@Body()` inteiro) e a nível de parâmetro (`@Query(new ZodValidationPipe(schema))`, valida
 * a query inteira). No uso a nível de método, o Nest chama `transform` para TODOS os
 * parâmetros decorados do handler, não só o `@Body()` — incluindo `@UserId()` (custom),
 * `@Param("id")` e `@Query("chave")` (extrações de uma chave específica, não o objeto inteiro).
 * Duas rodadas de bug já vieram daqui (achados do teste de ambiente local em 2026-07-19):
 * 1) sem filtro nenhum, o schema do corpo era validado também contra `userId`/`:id` (string),
 *    derrubando toda mutação com 400 "Expected object, received string".
 * 2) filtrar só por `metadata.type !== "body"` também bloqueava a validação de `@Query()`
 *    inteiro (mesmo `type: "query"` de uma extração por chave), quebrando os defaults de
 *    paginação de toda listagem — E ainda não pegava `@Query("strict")`/`@Query("id")`, que
 *    têm o mesmo `type: "query"`/`"param"` do uso legítimo mas com uma chave específica.
 * O sinal confiável não é `metadata.type` sozinho, é `metadata.data`: extrações de uma chave
 * específica (`@Query("strict")`, `@Param("id")`) sempre têm `data` preenchido; validação do
 * objeto inteiro (`@Body()`, `@Query()`/`@Query(pipe)` sem chave) sempre tem `data` vazio.
 * `metadata` fica opcional para não quebrar as chamadas diretas já existentes em
 * `zod-validation.pipe.spec.ts`.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata?: ArgumentMetadata): unknown {
    if (metadata && (metadata.data || (metadata.type !== "body" && metadata.type !== "query"))) {
      return value;
    }

    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((issue) => issue.message).join(", "));
    }
    return result.data;
  }
}
