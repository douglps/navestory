"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
  Switch,
  Tooltip,
} from "@navestory/ui";
import { Section, StateRow, Subsection } from "../section-shell";

interface MotionSectionProps {
  reducedMotion: boolean;
  onToggleReducedMotion: (value: boolean) => void;
}

export function MotionSection({
  reducedMotion,
  onToggleReducedMotion,
}: MotionSectionProps) {
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <Section
      title="Motion & Animação"
      description="Micro-feedback (100-150ms), entrada/saída de componente (200-250ms), reflow de layout (300-350ms teto). Existe para dar feedback funcional, nunca para decorar."
    >
      <div className="rounded-lg border border-warning bg-warning-pastel p-4 text-sm text-foreground">
        <strong>Gap real encontrado:</strong> <code>dialog.tsx</code>/
        <code>tooltip.tsx</code> já emitem as classes <code>animate-in</code>/
        <code>fade-in</code>/<code>animate-out</code>/<code>fade-out</code>{" "}
        (Radix <code>data-state</code>), mas o projeto não tem{" "}
        <code>tailwindcss-animate</code> instalado — essas classes são inertes
        em produção hoje. O Dialog abaixo anima de verdade só porque esta rota
        carrega um CSS local (<code>_lib/motion.css</code>) que dá efeito a
        essas mesmas classes, sem tocar nenhum arquivo de produção. A correção
        real (instalar o plugin ou autorar via <code>@utility</code> do Tailwind
        v4) é trabalho do Plano de Adoção.
      </div>

      <Subsection title="Micro-feedback (100-150ms) — já funciona nativamente em produção">
        <StateRow label="hover/active">
          <Button>Hover e clique aqui</Button>
        </StateRow>
        <StateRow label="toggle">
          <Switch
            checked={switchOn}
            onCheckedChange={setSwitchOn}
            aria-label="Demo de transição"
          />
        </StateRow>
      </Subsection>

      <Subsection title="Entrada/saída (200-250ms) — Dialog e Tooltip reais, animando">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir Dialog (fade real)</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Motion real</DialogTitle>
                <DialogDescription>
                  Este overlay e este conteúdo estão animando via o polyfill
                  local de _lib/motion.css.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Tooltip content="Fade real via motion.css local">
            <Button variant="ghost">Passe o mouse (fade real)</Button>
          </Tooltip>
        </div>
      </Subsection>

      <Subsection title="Reflow de layout (300-350ms teto)">
        <p className="text-sm text-muted-foreground">
          Accordion/Drawer ainda não existem em <code>packages/ui</code> —
          categoria documentada aqui como referência de duração-alvo (proposta
          §9), sem componente real para demonstrar hoje.
        </p>
      </Subsection>

      <Subsection title="Simular prefers-reduced-motion">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={reducedMotion}
            onChange={(e) => onToggleReducedMotion(e.target.checked)}
          />
          Simular reduced-motion (desativa animações desta página)
        </label>
        <p className="text-xs text-muted-foreground">
          Simulação local do showcase — não é a media query real do sistema
          operacional. Em produção, <code>prefers-reduced-motion: reduce</code>{" "}
          deve desativar todo decorativo e reduzir o resto a ≤100ms sem remover
          por completo.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-32" />
          <span className="text-xs text-muted-foreground">
            {reducedMotion ? "animate-pulse suspenso" : "animate-pulse ativo"}
          </span>
        </div>
      </Subsection>
    </Section>
  );
}
