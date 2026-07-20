#!/usr/bin/env node
/**
 * Pipeline de captura de necessidade de novos testes: roda no CI a cada PR/push e falha se
 * (1) um arquivo de código novo em src/ não tiver nenhum arquivo de teste correspondente, ou
 * (2) uma regra nova (R/S/P/C) adicionada a specs/RULES.md não tiver entrada em
 * matrices/rastreabilidade.md.
 *
 * Checagem só de PRESENÇA, não de qualidade/cobertura semântica — isso fica a cargo do agente
 * `tester`, acionado no fechamento de cada tarefa (ver .claude/settings.json, hook de commit
 * `feat:`). Ver conversa que originou este script: combinação de checagem mecânica (aqui,
 * grátis, roda em todo commit) + checagem com LLM (tester, uma vez por rodada de implementação).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";

function resolveDiffBase() {
  const candidates = [process.env.DIFF_BASE, "HEAD~1"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execSync(`git rev-parse --verify ${candidate}`, { stdio: "ignore" });
      return candidate;
    } catch {
      // tenta o próximo candidato
    }
  }
  return null;
}

function gitDiffNameStatus(base) {
  const output = execSync(`git diff --name-status --diff-filter=A ${base}...HEAD`, {
    encoding: "utf-8",
  });
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t")[1])
    .filter(Boolean);
}

const TEST_FILE_RE = /\.(spec|test)\.(ts|tsx|js|jsx)$/;
const SOURCE_EXT_RE = /\.(ts|tsx)$/;
const EXCLUDED_BASENAMES = new Set(["index.ts", "index.tsx"]);
const EXCLUDED_PATH_PARTS = ["/e2e/", "/dto/", ".d.ts"];

function isCandidateSourceFile(path) {
  if (!SOURCE_EXT_RE.test(path)) return false;
  if (TEST_FILE_RE.test(path)) return false;
  if (!/^(apps|packages)\/[^/]+\/src\//.test(path)) return false;
  const basename = path.split("/").pop();
  if (EXCLUDED_BASENAMES.has(basename)) return false;
  if (EXCLUDED_PATH_PARTS.some((part) => path.includes(part))) return false;
  return true;
}

function hasCorrespondingTest(path) {
  const dir = dirname(path);
  const ext = extname(path);
  const base = path.slice(0, -ext.length).split("/").pop();
  const variants = [".spec.ts", ".spec.tsx", ".test.ts", ".test.tsx"];
  return variants.some((suffix) => existsSync(join(dir, `${base}${suffix}`)));
}

function checkTestPairing(addedFiles) {
  const missing = addedFiles.filter(isCandidateSourceFile).filter((f) => !hasCorrespondingTest(f));
  return missing;
}

const RULE_ID_RE = /^### ([RSPC]\d+) — /;

function extractAddedRuleIds(base) {
  if (!existsSync("specs/RULES.md")) return [];
  let diff;
  try {
    diff = execSync(`git diff -U0 ${base}...HEAD -- specs/RULES.md`, { encoding: "utf-8" });
  } catch {
    return [];
  }
  const ids = [];
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const match = line.slice(1).match(RULE_ID_RE);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function checkRuleTraceability(addedRuleIds) {
  if (addedRuleIds.length === 0) return [];
  if (!existsSync("matrices/rastreabilidade.md")) return [];
  const matrix = readFileSync("matrices/rastreabilidade.md", "utf-8");
  return addedRuleIds.filter((id) => !matrix.includes(id));
}

function main() {
  const base = resolveDiffBase();
  if (!base) {
    console.log(
      "check-test-pairing: nenhuma base de diff válida encontrada (histórico raso demais) — pulando checagem.",
    );
    return;
  }

  const addedFiles = gitDiffNameStatus(base);
  const missingTests = checkTestPairing(addedFiles);
  const addedRuleIds = extractAddedRuleIds(base);
  const untracedRules = checkRuleTraceability(addedRuleIds);

  if (missingTests.length === 0 && untracedRules.length === 0) {
    console.log("check-test-pairing: ok — nenhum arquivo novo sem teste, nenhuma regra sem rastreabilidade.");
    return;
  }

  if (missingTests.length > 0) {
    console.error("\nArquivos de código novos sem teste correspondente (.spec/.test):");
    for (const file of missingTests) console.error(`  - ${file}`);
  }
  if (untracedRules.length > 0) {
    console.error("\nRegras novas em specs/RULES.md sem entrada em matrices/rastreabilidade.md:");
    for (const id of untracedRules) console.error(`  - ${id}`);
  }
  console.error(
    "\nSe algum desses itens é falso-positivo (ex: arquivo coberto por teste de integração, não unitário), justifique no PR — este check é só de presença, não decide sozinho.",
  );
  process.exit(1);
}

main();
