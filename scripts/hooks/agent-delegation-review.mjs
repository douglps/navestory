#!/usr/bin/env node
/**
 * Hook Stop (asyncRewake) do Claude Code: roda em segundo plano após cada resposta e faz uma
 * chamada `claude -p` aninhada (Haiku) para julgar, de forma retroativa, se a tarefa tinha uma
 * oportunidade CLARA de delegação a um dos agentes de .claude/agents/ que não foi aproveitada.
 * Fica em silêncio (exit 0) na maioria das vezes — só "acorda" a sessão (exit 2) quando o
 * julgamento é positivo, para não virar ruído a cada turno. A chamada aninhada roda com
 * settings isolado (hooks desativados) para não disparar este mesmo hook recursivamente.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const PROJECT_ROOT = process.cwd();
const AGENTS_DIR = join(PROJECT_ROOT, ".claude", "agents");
const MAX_TRANSCRIPT_LINES = 80;

function readStdin() {
  return new Promise((resolve) => {
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => resolve(raw));
  });
}

function loadAgentRoster() {
  if (!existsSync(AGENTS_DIR)) return "";
  const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));
  const roster = [];
  for (const file of files) {
    const content = readFileSync(join(AGENTS_DIR, file), "utf8");
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    if (nameMatch && descMatch) {
      roster.push(`- ${nameMatch[1].trim()}: ${descMatch[1].trim()}`);
    }
  }
  return roster.join("\n");
}

function loadRecentTranscript(transcriptPath) {
  if (!transcriptPath) return "";
  try {
    const lines = readFileSync(transcriptPath, "utf8").trim().split("\n");
    const recent = lines.slice(-MAX_TRANSCRIPT_LINES);
    // extrai só texto/tool_use relevante de cada linha JSONL, ignorando o resto do envelope
    const compact = recent
      .map((line) => {
        try {
          const entry = JSON.parse(line);
          const msg = entry?.message;
          if (!msg?.content) return null;
          const parts = Array.isArray(msg.content) ? msg.content : [msg.content];
          return parts
            .map((p) => {
              if (typeof p === "string") return p;
              if (p?.type === "text") return p.text;
              if (p?.type === "tool_use") return `[tool_use: ${p.name}${p.input?.subagent_type ? ` subagent_type=${p.input.subagent_type}` : ""}]`;
              if (p?.type === "tool_result") return null;
              return null;
            })
            .filter(Boolean)
            .join("\n");
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return compact.join("\n---\n");
  } catch {
    return "";
  }
}

function runNestedJudgeCall(prompt) {
  const tmpDir = mkdtempSync(join(tmpdir(), "agent-delegation-review-"));
  const settingsPath = join(tmpDir, "settings.json");
  writeFileSync(settingsPath, JSON.stringify({ disableAllHooks: true }));
  try {
    const out = execFileSync(
      "claude",
      ["-p", prompt, "--model", "haiku", "--settings", settingsPath],
      { encoding: "utf8", timeout: 45000, cwd: PROJECT_ROOT },
    );
    return out.trim();
  } catch {
    return "NONE";
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const transcript = loadRecentTranscript(input?.transcript_path);
  if (!transcript) process.exit(0);

  const roster = loadAgentRoster();

  const prompt = `Você é um revisor cético de processo. Abaixo está o roteiro de agentes especializados disponíveis num projeto, e o trecho mais recente de uma sessão de trabalho (turno do usuário + o que o assistente fez).

Sua única pergunta: havia uma oportunidade CLARA e INEQUÍVOCA de delegar parte desse trabalho a um dos agentes da lista, e essa delegação NÃO aconteceu (ou foi feita para o agente errado)? Considere delegação clara apenas quando a tarefa é claramente do domínio de um agente específico (ex: decisão de arquitetura sem tech-lead, criação de spec sem spec-writer, revisão de UX de tela sem ux-researcher). NÃO aponte casos discutíveis, ambíguos, ou tarefas pequenas/mecânicas que não justificam overhead de delegação.

Responda EXATAMENTE "NONE" se não há oportunidade clara. Caso contrário, responda com no máximo 2 frases em português pt-BR, direto ao ponto, dizendo qual agente deveria ter sido usado e por quê.

## Agentes disponíveis
${roster}

## Trecho recente da sessão
${transcript}`;

  const verdict = runNestedJudgeCall(prompt);

  if (!verdict || verdict.toUpperCase() === "NONE") {
    process.exit(0);
  }

  process.stderr.write(verdict);
  process.exit(2);
}

main();
