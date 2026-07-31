import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { decodeJwtRole } from "@/lib/auth/decode-jwt-role";
import { AdminNav } from "./admin-nav";

/**
 * @spec SPEC-20260731-008 RF-08, RF-09, RNF-04
 * Layout independente do grupo `(app)`: sem sidebar/header de usuário comum (RNF-04). A
 * verificação de role aqui é conveniência de UX — o middleware (RF-09) já bloqueia a navegação
 * antes de chegar neste Server Component, mas fica redundante de propósito (defesa em
 * profundidade) para o caso de acesso direto sem passar pelo middleware.
 */
export default async function AdminLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("nave_access_token")?.value;
  const role = accessToken ? decodeJwtRole(accessToken) : null;

  if (role !== "admin") {
    redirect("/403");
  }

  return (
    <div className="min-h-screen">
      <AdminNav />
      <div className="p-8">{children}</div>
    </div>
  );
}
