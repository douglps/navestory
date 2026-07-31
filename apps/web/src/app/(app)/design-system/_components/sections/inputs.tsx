"use client";

import { useState } from "react";
import {
  Checkbox,
  Combobox,
  CurrencyInput,
  DateRangePicker,
  type DateRange,
  FileUpload,
  Input,
  OdometerInput,
  Switch,
  Textarea,
} from "@nave/ui";
import { Section, StateRow, Subsection } from "../section-shell";

const VEHICLE_OPTIONS = [
  { value: "abc-1234", label: "Gol 2020 — ABC-1234" },
  { value: "xyz-5678", label: "Onix 2022 — XYZ-5678" },
  { value: "def-9012", label: "HB20 2019 — DEF-9012", disabled: true },
];

export function InputsSection() {
  const [comboValue, setComboValue] = useState<string>();
  const [switchOn, setSwitchOn] = useState(true);
  const [range, setRange] = useState<DateRange>();
  const [currency, setCurrency] = useState<number>();
  const [odometer, setOdometer] = useState<number>();

  return (
    <Section title="Inputs & Formulários" description="Input, Textarea, Checkbox, Switch, Combobox, DateRangePicker, FileUpload e os inputs mascarados (CurrencyInput/OdometerInput).">
      <Subsection title="Input — estados">
        <StateRow label="default">
          <Input placeholder="Valor da despesa" className="w-56" />
        </StateRow>
        <StateRow label="disabled">
          <Input placeholder="Campo desabilitado" disabled className="w-56" />
        </StateRow>
        <StateRow label="error">
          <Input placeholder="Falta informar o valor" error className="w-56" />
        </StateRow>
      </Subsection>

      <Subsection title="Textarea">
        <Textarea placeholder="Observações sobre a manutenção" className="w-full max-w-md" />
      </Subsection>

      <Subsection title="Checkbox & Switch">
        <StateRow label="checkbox">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox defaultChecked /> Lembrar deste veículo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox disabled /> Opção desabilitada
          </label>
        </StateRow>
        <StateRow label="switch">
          <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Notificações" />
          <span className="text-sm text-muted-foreground">{switchOn ? "Ativado" : "Desativado"}</span>
        </StateRow>
      </Subsection>

      <Subsection title="Combobox">
        <Combobox
          options={VEHICLE_OPTIONS}
          value={comboValue}
          onValueChange={setComboValue}
          placeholder="Selecionar veículo"
          aria-label="Veículo"
          className="w-64"
        />
      </Subsection>

      <Subsection title="DateRangePicker (com presets)">
        <DateRangePicker
          value={range}
          onValueChange={setRange}
          presets={[
            { label: "Últimos 7 dias", range: { from: new Date(Date.now() - 6 * 86400000), to: new Date() } },
            { label: "Este mês", range: { from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() } },
          ]}
        />
      </Subsection>

      <Subsection title="FileUpload (arraste um arquivo para ver isDragging)">
        <FileUpload onFilesChange={() => {}} label="Comprovante" hint="PNG, JPG ou PDF até 10MB" />
      </Subsection>

      <Subsection title="Inputs mascarados — CurrencyInput / OdometerInput">
        <StateRow label="moeda">
          <CurrencyInput value={currency} onChange={setCurrency} aria-label="Valor da despesa" />
        </StateRow>
        <StateRow label="odômetro">
          <OdometerInput value={odometer} onChange={setOdometer} aria-label="Quilometragem" />
        </StateRow>
      </Subsection>
    </Section>
  );
}
