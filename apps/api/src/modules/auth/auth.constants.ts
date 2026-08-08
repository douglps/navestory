/**
 * @spec SPEC-20260807-002 RF-B02
 * Reutilizado pelo decorator @Throttle de /auth/login e pelo alerta de força bruta emitido
 * no HttpExceptionFilter — mantém as duas pontas em sincronia sem hardcode duplicado.
 */
export const LOGIN_THROTTLE_LIMIT = 10;
export const LOGIN_THROTTLE_TTL_MS = 900_000;
