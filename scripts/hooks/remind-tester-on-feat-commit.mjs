#!/usr/bin/env node
/**
 * Hook PostToolUse (Bash) do Claude Code: quando um `git commit` com prefixo Conventional
 * Commits `feat` é detectado, lembra a sessão de acionar o agente `tester` antes de considerar
 * a tarefa fechada. Complementa scripts/check-test-pairing.mjs (checagem mecânica de presença
 * de arquivo de teste, roda no CI) com uma checagem semântica feita por LLM — só uma vez por
 * rodada de implementação encerrada em commit, não a cada edição de arquivo (custo de token
 * proporcional a features fechadas, não a edições).
 */
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const command = input?.tool_input?.command ?? "";
    const isGitCommit = /git commit/.test(command);
    const isFeat = /(^|[^a-zA-Z])feat(\(|:)/.test(command);
    if (isGitCommit && isFeat) {
      process.stdout.write(
        JSON.stringify({
          systemMessage:
            "Commit feat: detectado — antes de fechar a tarefa, rode o agente tester " +
            "(Agent tool, subagent_type: tester) para conferir se a implementação ganhou " +
            "cobertura de teste adequada, incluindo casos de borda do RF/CT correspondente.",
        }),
      );
    }
  } catch {
    // stdin malformado — não bloquear o commit por causa do hook
  }
});
