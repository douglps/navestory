-- @spec SPEC-20260814-003 RF-01
-- Índice parcial para acelerar as buscas de sugestão de fornecedor (histórico pessoal e de
-- workspace) em GET /expenses/suppliers?q=&workspace_id= — ver Notas Técnicas da spec para a
-- decisão de query direta com índice em vez de tabela de cache dedicada.
-- Sem CONCURRENTLY: nenhuma outra migration do projeto usa (roda dentro da transação padrão do
-- runner de migrations) e o volume atual da tabela `expenses` não justifica o risco/latência
-- extra de rodar fora de transação neste momento.
create index if not exists idx_expenses_user_supplier
  on public.expenses (user_id, supplier)
  where supplier is not null
    and category = 'fuel'
    and deleted_at is null;
