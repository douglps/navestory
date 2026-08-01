import {
  Badge,
  Card,
  ChartWrapper,
  KpiCard,
  NavBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  VehicleHealthScore,
} from "@navestory/ui";
import { Section, StateRow, Subsection } from "../section-shell";

const BADGE_VARIANTS = [
  "success",
  "warning",
  "danger",
  "info",
  "neutral",
] as const;

const ROWS = [
  {
    veiculo: "Gol 2020 — ABC-1234",
    categoria: "Combustível",
    valor: "R$ 284,90",
    data: "12/07",
  },
  {
    veiculo: "Onix 2022 — XYZ-5678",
    categoria: "Manutenção",
    valor: "R$ 1.150,00",
    data: "08/07",
  },
  {
    veiculo: "HB20 2019 — DEF-9012",
    categoria: "Seguro",
    valor: "R$ 320,00",
    data: "01/07",
  },
];

export function DadosSection() {
  return (
    <Section
      title="Exibição de Dados"
      description="Card, Table, KpiCard, Badge, ChartWrapper, VehicleHealthScore e NavBadge."
    >
      <Subsection title="KpiCard — trend, sparkline, loading">
        <div className="flex flex-wrap gap-3">
          <KpiCard
            title="Custo por km"
            value="1,42"
            unit="R$"
            trend={{ value: -6.3, label: "vs. mês anterior" }}
            sparkline={[1.6, 1.55, 1.5, 1.48, 1.44, 1.42]}
          />
          <KpiCard
            title="Despesas do mês"
            value="12"
            unit="registros"
            trend={{ value: 12, label: "vs. mês anterior" }}
            reverseTrend
          />
          <KpiCard title="Calculando" value="—" loading />
        </div>
      </Subsection>

      <Subsection title="Badge — variant">
        <StateRow label="variant">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant === "neutral"
                ? "pendente"
                : variant === "success"
                  ? "em dia"
                  : variant === "danger"
                    ? "em atraso"
                    : variant}
            </Badge>
          ))}
        </StateRow>
      </Subsection>

      <Subsection title="VehicleHealthScore">
        <div className="flex flex-wrap items-center gap-4">
          <VehicleHealthScore score={85} />
          <VehicleHealthScore score={55} />
          <VehicleHealthScore score={20} />
          <VehicleHealthScore score={undefined} />
        </div>
      </Subsection>

      <Subsection title="NavBadge">
        <div className="flex items-center gap-3">
          <span className="text-sm">Manutenções</span>
          <NavBadge count={3} />
          <span className="text-sm">Alertas</span>
          <NavBadge count={14} />
          <span className="text-sm text-muted-foreground">
            count=0 (não renderiza nada) →
          </span>
          <NavBadge count={0} />
        </div>
      </Subsection>

      <Subsection title="Table — striped, hover">
        <p className="text-xs text-muted-foreground">
          `striped` (bg-muted/15, produção) some contra o card no dark mode —
          className=&quot;bg-muted/60&quot; aqui aumenta a intensidade só nesta
          demo, sem editar table.tsx.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row, index) => (
              <TableRow
                key={row.veiculo}
                striped={index % 2 === 1}
                className={index % 2 === 1 ? "bg-muted/60" : undefined}
              >
                <TableCell>{row.veiculo}</TableCell>
                <TableCell>{row.categoria}</TableCell>
                <TableCell>{row.valor}</TableCell>
                <TableCell>{row.data}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Subsection>

      <Subsection title="Card — padding sm/md/lg">
        <div className="flex flex-wrap gap-3">
          <Card padding="sm">padding=sm</Card>
          <Card padding="md">padding=md</Card>
          <Card padding="lg">padding=lg</Card>
        </div>
      </Subsection>

      <Subsection title="ChartWrapper — loading / isEmpty / com conteúdo">
        <div className="grid gap-3 sm:grid-cols-3">
          <ChartWrapper title="Custo por km" loading>
            <div />
          </ChartWrapper>
          <ChartWrapper
            title="Custo por km"
            isEmpty
            emptyMessage="Sem dados para exibir"
          >
            <div />
          </ChartWrapper>
          <ChartWrapper title="Custo por km" description="Últimos 6 meses">
            <div className="flex h-24 items-end gap-1">
              {[40, 55, 48, 60, 52, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </ChartWrapper>
        </div>
      </Subsection>
    </Section>
  );
}
