import type { Meta, StoryObj } from "@storybook/react-vite";
import { KpiCard } from "./kpi-card";

const meta: Meta<typeof KpiCard> = {
  title: "Componentes/KpiCard",
  component: KpiCard,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

export const ComTendenciaPositiva: Story = {
  args: {
    title: "Custo por km",
    value: "R$ 0,42",
    trend: { value: 8, label: "vs. mês anterior" },
    sparkline: [0.5, 0.48, 0.46, 0.44, 0.42],
  },
};

export const ComTendenciaNegativa: Story = {
  args: {
    title: "Manutenções em atraso",
    value: 3,
    trend: { value: -12, label: "vs. mês anterior" },
    reverseTrend: true,
  },
};

export const Carregando: Story = {
  args: {
    title: "Custo por km",
    value: "—",
    loading: true,
  },
};
