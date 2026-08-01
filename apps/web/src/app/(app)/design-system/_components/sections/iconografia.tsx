import {
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Fuel,
  Gauge,
  MapPin,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  Wrench,
} from "lucide-react";
import { Alert, EmptyState, KpiCard } from "@navestory/ui";
import { Section, Subsection } from "../section-shell";

const ICONS = [
  { Icon: Car, name: "Car" },
  { Icon: Gauge, name: "Gauge" },
  { Icon: Wallet, name: "Wallet" },
  { Icon: Wrench, name: "Wrench" },
  { Icon: Fuel, name: "Fuel" },
  { Icon: Calendar, name: "Calendar" },
  { Icon: Bell, name: "Bell" },
  { Icon: Search, name: "Search" },
  { Icon: Settings, name: "Settings" },
  { Icon: MapPin, name: "MapPin" },
  { Icon: Clock, name: "Clock" },
  { Icon: ShieldCheck, name: "ShieldCheck" },
  { Icon: BarChart3, name: "BarChart3" },
  { Icon: Upload, name: "Upload" },
  { Icon: Trash2, name: "Trash2" },
  { Icon: CheckCircle2, name: "CheckCircle2" },
];

function VehicleSilhouette() {
  return (
    <svg viewBox="0 0 100 60" className="h-24 w-40" aria-hidden>
      <path
        d="M10 42 Q10 30 25 28 L35 16 Q40 12 48 12 L65 12 Q72 12 76 18 L84 28 Q92 30 92 42 L92 46 L10 46 Z"
        fill="none"
        stroke="oklch(70% 0.10 250)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle
        cx="28"
        cy="46"
        r="6"
        fill="none"
        stroke="oklch(70% 0.10 250)"
        strokeWidth="2"
      />
      <circle
        cx="74"
        cy="46"
        r="6"
        fill="none"
        stroke="oklch(70% 0.10 250)"
        strokeWidth="2"
      />
    </svg>
  );
}

function OnboardingIllustration() {
  return (
    <svg viewBox="0 0 100 60" className="h-24 w-40" aria-hidden>
      <circle
        cx="50"
        cy="30"
        r="22"
        fill="none"
        stroke="oklch(60% 0.15 250)"
        strokeWidth="2"
      />
      <path
        d="M50 18v12l8 8"
        fill="none"
        stroke="oklch(48% 0.10 82)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ErrorIllustration() {
  return (
    <svg viewBox="0 0 100 60" className="h-24 w-40" aria-hidden>
      <path
        d="M30 45 L50 15 L70 45 Z"
        fill="none"
        stroke="oklch(80% 0.06 250)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line
        x1="50"
        y1="28"
        x2="50"
        y2="36"
        stroke="oklch(80% 0.06 250)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="41" r="1.2" fill="oklch(80% 0.06 250)" />
    </svg>
  );
}

export function IconografiaSection() {
  return (
    <Section
      title="Iconografia & Ilustração"
      description="Lucide (stroke-based, já dependência real de apps/web) — não usado dentro de packages/ui hoje (ícones lá são SVG inline), mas injetado via props (icon=, custom icon de Steps) exatamente como um consumidor real faria."
    >
      <Subsection title="Grade de ícones — 24×24, stroke 1.5-2px">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {ICONS.map(({ Icon, name }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1 rounded-md border border-border p-2 text-center"
            >
              <Icon size={24} strokeWidth={1.75} aria-hidden />
              <span className="text-[10px] text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </Subsection>

      <Subsection title="Ícones injetados em componentes reais">
        <div className="flex flex-wrap gap-3">
          <Alert
            variant="info"
            icon={<Wrench size={20} aria-hidden />}
            description="Ícone customizado via prop icon= do Alert."
            className="max-w-sm"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <KpiCard
            title="Combustível"
            value="R$ 420"
            icon={<Fuel size={16} aria-hidden />}
          />
        </div>
        <EmptyState
          icon={<Search size={32} strokeWidth={1.5} aria-hidden />}
          title="Nenhum resultado encontrado"
          description="Tente outro termo de busca."
        />
      </Subsection>

      <Subsection title="Ilustração line-art — geométrica, tonal, nunca sticker colorido">
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center gap-1">
            <VehicleSilhouette />
            <span className="text-xs text-muted-foreground">
              Empty state de despesas
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <OnboardingIllustration />
            <span className="text-xs text-muted-foreground">
              Onboarding (boas-vindas)
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ErrorIllustration />
            <span className="text-xs text-muted-foreground">
              Erro / sem conexão
            </span>
          </div>
        </div>
      </Subsection>

      <Subsection title="Regras">
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          <li>
            Peso de traço único (stroke, não filled), 1.5-2px — nunca misturar
            line com filled na mesma tela.
          </li>
          <li>
            Grid de 24×24px, satisfazendo alvo mínimo de toque quando
            interativo.
          </li>
          <li>
            Ícone herda cor via currentColor — nunca cor hardcoded no SVG.
          </li>
          <li>Proibido ícone multicolor "sticker".</li>
        </ul>
      </Subsection>
    </Section>
  );
}
