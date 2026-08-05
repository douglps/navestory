import type { ReactNode } from "react";
import { WorkspaceNav } from "./workspace-nav";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-12
 * Layout independente do grupo `(app)`, mesmo padrão de `apps/web/src/app/admin/layout.tsx`.
 * Sem redirect por role aqui: criação de workspace (R-WS-01) é aberta a qualquer usuário
 * autenticado, então a checagem "sou owner/member/nenhum dos dois" é feita pela própria
 * página a partir da resposta de `GET /workspaces/me` — a autenticação em si já é garantida
 * pelo middleware para qualquer rota fora de PUBLIC_PATHS.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="min-h-screen">
      <WorkspaceNav />
      <div className="p-8">{children}</div>
    </div>
  );
}
