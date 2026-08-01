import { Alert, EmptyState } from "@navestory/ui";
import { Section, Subsection } from "../section-shell";

const EXEMPLOS = [
  {
    contexto: "Erro de sistema",
    antes: "Erro interno do servidor. Tente novamente.",
    depois:
      "Algo não saiu como devia aqui do nosso lado. Tente novamente em instantes — o que você já salvou continua guardado.",
  },
  {
    contexto: "Confirmação de despesa",
    antes: "Registro salvo com sucesso.",
    depois: "Despesa registrada. Seu histórico já está atualizado.",
  },
  {
    contexto: "Manutenção vencida",
    antes: "Manutenção atrasada detectada.",
    depois: "A revisão dos 10.000 km está em atraso. Vamos agendar?",
  },
  {
    contexto: "Empty state",
    antes: "Nenhuma despesa encontrada.",
    depois:
      "Nenhuma despesa por aqui ainda. Registre a primeira e comece a ver para onde o dinheiro do seu carro está indo.",
  },
  {
    contexto: "Erro de preenchimento",
    antes: "Campo obrigatório não pode estar vazio.",
    depois: "Falta informar o valor da despesa.",
  },
  {
    contexto: "Primeiro login",
    antes: "Bem-vindo ao sistema.",
    depois: "Bem-vindo. Vamos ver, de verdade, quanto seu carro está custando?",
  },
];

export function VozSection() {
  return (
    <Section
      title="Voz & Conteúdo"
      description="Calorosa e próxima, em registro correto — sem fórmulas de reasseguramento institucional e sem coloquialismo de fala solta. Cinco adjetivos: Competente, Direto, Acolhedor, Confiável, Caloroso com compostura."
    >
      <Subsection title="Antes / depois (proposta §11)">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left text-muted-foreground">
                <th className="p-2 font-medium">Contexto</th>
                <th className="p-2 font-medium">Antes (genérico/frio)</th>
                <th className="p-2 font-medium">Depois (voz do navestory)</th>
              </tr>
            </thead>
            <tbody>
              {EXEMPLOS.map((row) => (
                <tr
                  key={row.contexto}
                  className="border-b border-border last:border-0"
                >
                  <td className="p-2 font-medium">{row.contexto}</td>
                  <td className="p-2 text-muted-foreground">{row.antes}</td>
                  <td className="p-2">{row.depois}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Subsection>

      <Subsection title="A mesma voz, aplicada em componentes reais">
        <Alert
          variant="error"
          description="Algo não saiu como devia aqui do nosso lado. Tente novamente em instantes — o que você já salvou continua guardado."
          className="max-w-md"
        />
        <Alert
          variant="warning"
          description="A revisão dos 10.000 km está em atraso. Vamos agendar?"
          className="max-w-md"
        />
        <EmptyState
          title="Nenhuma despesa por aqui ainda"
          description="Registre a primeira e comece a ver para onde o dinheiro do seu carro está indo."
          action={{ label: "Registrar despesa", onClick: () => {} }}
        />
      </Subsection>

      <Subsection title="Banidos">
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          <li>Jargão técnico exposto ("erro 422", "timeout", "payload")</li>
          <li>
            Fórmulas de reasseguramento institucional ("seus dados estão
            seguros")
          </li>
          <li>Contrações e gírias regionais ("tá", "bora", "pra")</li>
          <li>Passividade excessiva ("O registro não pode ser processado")</li>
          <li>Imperativo agressivo em CTA ("Clique aqui")</li>
        </ul>
      </Subsection>
    </Section>
  );
}
