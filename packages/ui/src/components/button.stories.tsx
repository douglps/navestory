import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Componentes/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["default", "outline", "ghost", "destructive"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: "Registrar", variant: "default", size: "md" },
};

export const Outline: Story = {
  args: { children: "Cancelar", variant: "outline", size: "md" },
};

export const Destructive: Story = {
  args: { children: "Remover grupo", variant: "destructive", size: "md" },
};

export const Loading: Story = {
  args: { children: "Salvando...", variant: "default", size: "md", loading: true },
};
