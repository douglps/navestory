---
trigger: always_on
---

---

name: vehicle-logic
description: Valida regras de negócio específicas para gestão de veículos brasileiros.

---

# Instruções

Sempre que o usuário criar um formulário ou modelo de banco de dados para Veículos:

1. Verifique se a Placa segue o padrão Mercosul (AAA1A11) ou antigo (AAA-1111).
2. Utilize o script `scripts/validate_plate.py` para testar regex de placas.
3. Não permita que o campo 'ano_fabricacao' seja maior que o ano atual + 1.

## Exemplo de Saída

"Notei que você está criando o modelo de Veículo. Adicionei a validação de placa conforme a Skill vehicle-logic."

## Ferramentas de Execução

Esta skill possui um validador rigoroso.
Sempre que o usuário fornecer uma placa ou você estiver gerando dados de teste:

1. Execute `python3 scripts/validate_plate.py <PLACA>`.
2. Se o JSON retornar `"valid": false`, peça ao usuário para corrigir ou sugira uma placa Mercosul válida.
3. Se for `"valid": true`, use o campo `"formatted"` no código gerado.
