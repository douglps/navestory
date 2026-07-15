import type { ReactNode } from "react";
import { HealthStatus } from "./health-status";

export default function HomePage(): ReactNode {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Nave</h1>
      <HealthStatus />
    </main>
  );
}
