import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260525-001 §6.3, §4.3
 * SVGs fixos do mesmo set semântico usado em `Alert` (✓/✗) — indicador de estado do
 * círculo é semântico (progresso do fluxo lido por leitor de tela), não substituível.
 */
function CheckIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 10.5l2.2 2.2 4.8-5.4" />
    </svg>
  );
}

function ErrorIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7l6 6M13 7l-6 6" />
    </svg>
  );
}

export interface StepItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export interface StepsProps {
  steps: StepItem[];
  currentStep: number;
  completedSteps?: number[];
  errorSteps?: number[];
  onStepClick?: (index: number) => void;
  "aria-label"?: string;
  className?: string;
}

type StepState = "completed" | "current" | "upcoming" | "error";

function stepState(index: number, currentStep: number, completed: boolean, error: boolean): StepState {
  if (error) return "error";
  if (completed) return "completed";
  if (index === currentStep) return "current";
  return "upcoming";
}

function circleStateClass(state: StepState): string {
  switch (state) {
    case "completed":
      return "border-success bg-success text-success-foreground";
    case "current":
      return "border-primary bg-background text-primary";
    case "error":
      return "border-danger bg-danger text-danger-foreground";
    case "upcoming":
    default:
      return "border-border bg-background text-muted-foreground";
  }
}

function labelStateClass(state: StepState): string {
  switch (state) {
    case "completed":
      return "text-foreground";
    case "current":
      return "font-semibold text-foreground";
    case "error":
      return "text-danger";
    case "upcoming":
    default:
      return "text-muted-foreground";
  }
}

/** @spec SPEC-20260525-001 §6.3 */
export function Steps({
  steps,
  currentStep,
  completedSteps = [],
  errorSteps = [],
  onStepClick,
  "aria-label": ariaLabel = "Progresso",
  className,
}: StepsProps): ReactNode {
  return (
    <ol aria-label={ariaLabel} className={cn("flex w-full items-start", className)}>
      {steps.map((step, index) => {
        const state = stepState(index, currentStep, completedSteps.includes(index), errorSteps.includes(index));
        const clickable = Boolean(onStepClick) && (state === "completed" || state === "error");
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.id}
            aria-current={state === "current" ? "step" : undefined}
            className={cn("flex flex-1 flex-col items-center gap-1.5", !isLast && "relative")}
          >
            <div className="flex w-full items-center">
              <div className={cn("h-0.5 flex-1 bg-border", index === 0 && "invisible")} />
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  aria-label={`${step.label} (${state === "error" ? "erro" : "concluído"}) — voltar a esta etapa`}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    circleStateClass(state),
                  )}
                >
                  {state === "completed" && <CheckIcon />}
                  {state === "error" && <ErrorIcon />}
                </button>
              ) : (
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm",
                    circleStateClass(state),
                  )}
                >
                  {step.icon && (state === "upcoming" || state === "current") && (
                    <span aria-hidden="true">{step.icon}</span>
                  )}
                  {state === "completed" && <CheckIcon />}
                  {state === "error" && <ErrorIcon />}
                </div>
              )}
              <div className={cn("h-0.5 flex-1", isLast && "invisible", "bg-border")} />
            </div>
            <div className="flex flex-col items-center text-center">
              <span className={cn("text-sm", labelStateClass(state))}>{step.label}</span>
              {step.description && (
                <span className="text-xs text-muted-foreground">{step.description}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
