#!/usr/bin/env node
/**
 * Doc-sync-gate: avisa (não bloqueia) quando um PR/push altera specs/RULES.md ou uma
 * spec de feature (specs/<feature>/SPEC-*.md) sem tocar nenhum arquivo em matrices/ no
 * mesmo diff — o padrão de gap encontrado em `docs/discussions/2026-07-31-analise-comparativa-nave-saas-legacy.md`
 * (matrices/permissoes.md desatualizada em relação a specs/código já corrigidos).
 *
 * Deliberadamente só avisa (exit code 0) nesta primeira versão: nem toda spec que muda
 * (ex: frontend/design puro) precisa tocar matriz, e um falso-bloqueio aqui geraria mais
 * atrito do que o gap que o check tenta prevenir. Ver nota de processo em specs/RULES.md
 * (mesma filosofia do check-test-pairing.mjs: mecânico e barato, sem julgamento semântico).
 */
import { execSync } from "node:child_process";

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

function gitDiffNameOnly(base) {
  const output = execSync(`git diff --name-only ${base}...HEAD`, {
    encoding: "utf-8",
  });
  return output.split("\n").filter(Boolean);
}

const RULES_RE = /^specs\/RULES\.md$/;
const SPEC_RE = /^specs\/[^/]+\/SPEC-\d{8}-\d{3}.*\.md$/;
const MATRIX_RE = /^matrices\//;

function main() {
  const base = resolveDiffBase();
  if (!base) {
    console.log(
      "check-doc-sync: nenhuma base de diff válida encontrada (histórico raso demais) — pulando checagem.",
    );
    return;
  }

  const changedFiles = gitDiffNameOnly(base);
  const touchedSpecsOrRules = changedFiles.filter((f) => RULES_RE.test(f) || SPEC_RE.test(f));
  const touchedMatrices = changedFiles.some((f) => MATRIX_RE.test(f));

  if (touchedSpecsOrRules.length === 0) {
    console.log("check-doc-sync: ok — nenhuma spec/RULES.md alterada neste diff.");
    return;
  }

  if (touchedMatrices) {
    console.log("check-doc-sync: ok — spec/RULES.md alterada e matriz também tocada no mesmo diff.");
    return;
  }

  console.warn(
    "\n[aviso] Este diff altera specs/RULES.md ou uma spec de feature, mas nenhum arquivo em matrices/ foi tocado:",
  );
  for (const file of touchedSpecsOrRules) console.warn(`  - ${file}`);
  console.warn(
    "\nSe a mudança afeta permissões, rastreabilidade ou regras versionadas, atualize a matriz correspondente " +
      "(matrices/permissoes.md, matrices/rastreabilidade.md) no mesmo PR. Se não afeta (ex: spec de frontend/design " +
      "sem impacto em endpoint/regra rastreável), ignore este aviso — não bloqueia o pipeline.",
  );
}

main();
