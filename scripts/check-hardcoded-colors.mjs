#!/usr/bin/env node
/**
 * @spec SPEC-20260729-002 RF-04, RF-05, RF-06
 * Formaliza como check de CI a varredura manual de cor hardcoded já feita em SPEC-20260729-002:
 * bloqueia hex literal (`#RRGGBB`) e OKLCH literal (`oklch(75% ...)`) fora do sistema de tokens.
 * `oklch(var(--token))` — referência dinâmica ao token real, não um valor cravado — é sempre
 * permitido em qualquer arquivo, inclusive fora da lista de exceções abaixo.
 *
 * Ver `specs/design-system/PLANO-MIGRACAO-SHOWCASE-INFRA.md` Rodada 6 para o racional de cada
 * exceção documentada.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
// Só literal (começa com dígito) — `oklch(var(--x))` é referência a token, sempre permitido.
const OKLCH_LITERAL_RE = /oklch\(\s*[\d.]/;

/** Arquivos/pastas onde cor hardcoded é a própria fonte de verdade ou uma exceção documentada. */
const ALLOWED_PATH_PATTERNS = [
  // Fonte de verdade dos tokens — SPEC-20260525-001 §4.1, SPEC-20260729-001 RF-01
  /^packages\/ui\/src\/tokens\//,
  // Sincronizado manualmente a partir dos tokens acima (ver colors.ts) — mesmo papel
  /^apps\/web\/src\/app\/globals\.css$/,
  // Protótipos decorativos isolados, fora do design system real — R-DS-03 explicitamente não
  // se aplica (ver comentário de `gold` em packages/ui/src/tokens/colors.ts)
  /^apps\/web\/src\/app\/\(app\)\/dashboard\/concept\//,
  // As 5 direções de marca não escolhidas (rota/pulso/horizonte/campo/bussola) seguem como
  // protótipo de comparação — só `prata` foi migrada para tokens reais (Rodada 1 do plano)
  /^apps\/web\/src\/app\/\(app\)\/brand-showcase\/_data\/directions\.ts$/,
  // Paleta pré-definida de cor customizável pelo usuário (US do domínio, não decisão de marca)
  /^packages\/validators\/src\/vehicle-group\.schemas\.ts$/,
  // `theme_color`/`background_color` do manifest PWA e `themeColor` de metadata do Next.js —
  // APIs de browser fora do contexto CSS, exigem string hex literal, não aceitam `var()`
  /^apps\/web\/src\/app\/manifest\.ts$/,
  /^apps\/web\/src\/app\/layout\.tsx$/,
  // Utilitário de conversão hex/OKLCH→luminância do showcase: o padrão "oklch(" aparece dentro
  // de regex/string de parsing, não como valor de cor
  /^apps\/web\/src\/app\/\(app\)\/brand-showcase\/_lib\/contrast\.ts$/,
];

const EXCLUDE_DIR_RE = /\/(node_modules|\.next|dist|coverage)\//;
const TEST_FILE_RE = /\.(spec|test)\.(ts|tsx)$/;

function listTrackedFiles() {
  const output = execSync(
    'git ls-files -- "apps/**/*.ts" "apps/**/*.tsx" "apps/**/*.css" "packages/**/*.ts" "packages/**/*.tsx" "packages/**/*.css"',
    { encoding: "utf-8" },
  );
  return output.split("\n").filter(Boolean);
}

function isAllowed(path) {
  return ALLOWED_PATH_PATTERNS.some((re) => re.test(path));
}

function findViolations(files) {
  const violations = [];
  for (const path of files) {
    if (EXCLUDE_DIR_RE.test(`/${path}`)) continue;
    if (TEST_FILE_RE.test(path)) continue;
    if (isAllowed(path)) continue;

    let content;
    try {
      content = readFileSync(path, "utf-8");
    } catch {
      continue;
    }

    content.split("\n").forEach((line, index) => {
      const trimmed = line.trim();
      // Comentários (JS `//`/`/*`/`*`/`*/` ou CSS `/* */`) só documentam cor, não a definem —
      // evita falso positivo em prosa que cita um hex antigo/removido para contexto histórico.
      const isCommentLine = /^(\/\/|\/\*|\*)/.test(trimmed);
      if (isCommentLine) return;
      if (HEX_RE.test(line) || OKLCH_LITERAL_RE.test(line)) {
        violations.push({ path, line: index + 1, text: trimmed });
      }
    });
  }
  return violations;
}

function main() {
  const files = listTrackedFiles();
  const violations = findViolations(files);

  if (violations.length === 0) {
    console.log("check-hardcoded-colors: ok — nenhuma cor hardcoded fora do sistema de tokens.");
    return;
  }

  console.error("Cor hardcoded encontrada fora do sistema de tokens (hex ou oklch() literal):\n");
  for (const { path, line, text } of violations) {
    console.error(`  ${path}:${line}  ${text}`);
  }
  console.error(
    "\nUse os tokens de packages/ui/src/tokens/colors.ts (classe Tailwind ou oklch(var(--token))) " +
      "em vez de um valor cravado. Se este é um caso legítimo novo (ex: API de browser que exige " +
      "hex literal), adicione o caminho a ALLOWED_PATH_PATTERNS em scripts/check-hardcoded-colors.mjs " +
      "com o racional documentado, mesmo padrão das exceções existentes.",
  );
  process.exit(1);
}

main();
