import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./card";

const meta: Meta<typeof Card> = {
  title: "Componentes/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    padding: { control: "select", options: ["sm", "md", "lg"] },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    padding: "md",
    children: (
      <>
        <h3 className="text-base font-semibold">Título do card</h3>
        <p className="mt-1 text-sm text-muted-foreground">Conteúdo de exemplo dentro do card.</p>
      </>
    ),
  },
};
