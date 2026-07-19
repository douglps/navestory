import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Steps, type StepItem } from "./steps";

const STEPS: StepItem[] = [
  { id: "personal", label: "Dados", description: "Informações pessoais" },
  { id: "vehicle", label: "Veículo", description: "Dados do veículo" },
  { id: "review", label: "Revisão" },
  { id: "confirm", label: "Confirmar" },
];

describe("Steps", () => {
  it("marca o passo atual com aria-current='step'", () => {
    render(<Steps steps={STEPS} currentStep={1} completedSteps={[0]} />);

    const currentItem = screen.getByText("Veículo").closest("li");
    expect(currentItem).toHaveAttribute("aria-current", "step");
  });

  it("não marca passos concluídos ou futuros como atuais", () => {
    render(<Steps steps={STEPS} currentStep={1} completedSteps={[0]} />);

    expect(screen.getByText("Dados").closest("li")).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Revisão").closest("li")).not.toHaveAttribute("aria-current");
  });

  it("permite clicar em um passo concluído via onStepClick", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    render(<Steps steps={STEPS} currentStep={1} completedSteps={[0]} onStepClick={onStepClick} />);

    await user.click(screen.getByRole("button", { name: /Dados/ }));

    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it("não renderiza como botão clicável um passo upcoming", () => {
    render(<Steps steps={STEPS} currentStep={1} completedSteps={[0]} onStepClick={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /Revisão/ })).not.toBeInTheDocument();
  });

  it("exibe o passo marcado em errorSteps com estilo de erro", () => {
    render(<Steps steps={STEPS} currentStep={2} completedSteps={[0, 1]} errorSteps={[1]} />);

    expect(screen.getByText("Veículo")).toHaveClass("text-danger");
  });

  it("não possui violações de acessibilidade", async () => {
    const { container } = render(
      <Steps steps={STEPS} currentStep={1} completedSteps={[0]} errorSteps={[]} onStepClick={vi.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
