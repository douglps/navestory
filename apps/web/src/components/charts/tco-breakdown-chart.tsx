import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VehicleTco } from "@nave/validators";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const BREAKDOWN_LABEL: Record<keyof VehicleTco["breakdown"], string> = {
  fuel: "Combustível",
  maintenance: "Manutenção",
  fines: "Multas",
  recurring: "Custos recorrentes",
  other: "Outros",
};

/**
 * @spec SPEC-20260622-001 RF-01, RF-13, R-ANA-04
 * @spec SPEC-20260531-001 RF-DB-04
 * Extraído de apps/web/src/app/(app)/analytics/page.tsx (T6.1) para ser reaproveitado pelo
 * VehicleSpotlight (Sprint 2 do dashboard) sem duplicar a lógica de apresentação do breakdown.
 */
export function TcoBreakdownChart({ breakdown }: { breakdown: VehicleTco["breakdown"] }): ReactNode {
  // Defesa contra `breakdown` ausente/malformado (ex: resposta de API antiga presa no cache do
  // Service Worker — StaleWhileRevalidate, SPEC-20260712-001 RF-08 — servida antes de um fix de
  // contrato de API): o TypeScript garante o formato em tempo de build, não em runtime.
  if (!breakdown) {
    return <p className="text-sm text-muted-foreground">Não foi possível carregar o breakdown de custos.</p>;
  }

  const data = (Object.keys(breakdown) as Array<keyof VehicleTco["breakdown"]>).map(
    // eslint-disable-next-line security/detect-object-injection -- key é keyof VehicleTco["breakdown"], união fixa de 5 literais
    (key) => ({ category: BREAKDOWN_LABEL[key], amount: breakdown[key] }),
  );

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Bar dataKey="amount" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Breakdown de custo por categoria</caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col">Categoria</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{currency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
