---
name: nave-compliance
description: Garante que o projeto Nave respeite a LGPD e Auditoria.
---

# ⚖️ Regras de Compliance

## 🕵️ Auditoria de Logs

- Antes de gerar qualquer `console.log` ou log de servidor, verifique se há dados PII (Email, Placa, Nome).
- **Ação:** Mascare os dados (ex: `pla***-123`).

## 🗑️ Direito ao Esquecimento

- Toda deleção de veículo ou usuário deve ser um `soft-delete` seguido de `anonymization` (limpeza dos campos de identificação) conforme o RF-003.

## 📅 Alertas de Manutenção

- Garanta que a lógica de "7 dias antes" (RF-006) esteja sempre baseada no Timezone do usuário, convertendo para UTC no banco.
