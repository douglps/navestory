"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

interface HealthResponse {
  status: "ok";
  timestamp: string;
}

async function fetchHealth(): Promise<HealthResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${apiUrl}/health`);
  if (!response.ok) {
    throw new Error(`API respondeu ${response.status}`);
  }
  return response.json() as Promise<HealthResponse>;
}

/**
 * Exemplo de hidratação de dado de servidor via TanStack Query (T0.4).
 */
export function HealthStatus(): ReactNode {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  if (isLoading) return <p className="text-sm text-gray-500">Verificando API...</p>;
  if (isError) return <p className="text-sm text-red-500">API indisponível</p>;

  return (
    <p className="text-sm text-green-600">
      API: {data?.status} ({data?.timestamp})
    </p>
  );
}
