# Billing Integration Layer — Fase 4 Hardening & Aceitação

Data: 2026-06-16
Estado: ✅ Camada implementada, isolada e segura. Pronto para uso com ManualExportAdapter.

---

## 1. Verificações automáticas executadas

### Segurança backend
- `security--run_security_scan` → 194 findings totais (warns), **0 críticos**, **0 relativos a `billing_*`**.
  Todos os warns são pré-existentes do projeto (storage buckets públicos, SECURITY DEFINER de outros módulos).
  As tabelas `billing_integrations`, `billing_documents`, `billing_document_lines`, `billing_customers`,
  `billing_sync_logs` passaram sem novos avisos.
- Vault: `vault_secret_id` mascarado pela view `billing_integrations_safe` (frontend nunca recebe o uuid real).
- `billing_vault_put` / `billing_vault_get` revogados para `authenticated`; apenas `service_role`.

### Permissões (gates 401/403)
Todas testadas via `supabase--curl_edge_functions`:

| Edge function | Sem permissão | Resultado |
|---|---|---|
| `billing-test-connection` | sem `billing.configure` | 403 `Missing billing.configure permission` ✅ |
| `billing-prepare-document` | sem `billing.prepare` | 403 `Missing billing.prepare permission` ✅ |
| `billing-issue-document` | sem `billing.issue` | 403 `Missing billing.issue permission` ✅ |

JWT validation, CORS e Zod input validation ativos em todas as 7 funções.

---

## 2. Checklist dos 16 critérios da spec §15

| # | Critério | Estado | Notas |
|---|---|---|---|
| 1 | Camada nova, opcional, isolada | ✅ | Tabelas `billing_*`, módulo `src/modules/billing/`, edge functions `billing-*`. Zero alteração em Obras/Orçamentos/Autos/Financeiro |
| 2 | Não emite faturação fiscal própria | ✅ | Banner permanente em UI; `manual_export` marcado como "Não constitui documento fiscal oficial" |
| 3 | RLS estrita por `organization_id` | ✅ | Todas as 5 tabelas com policies via `has_billing_permission()` + `get_user_org_id()` |
| 4 | Credenciais no Vault (não em colunas) | ✅ | Apenas `vault_secret_id uuid` em `billing_integrations`; frontend lê via view `billing_integrations_safe` |
| 5 | Recalculo total no backend | ✅ | `_shared/billing/totals.ts` recomputa subtotal_net/tax/retention/gross/payable a partir das tabelas-fonte |
| 6 | Idempotência (`idempotency_key`) | ✅ | SHA-256(`empresa_id‖source_type‖source_id‖document_type‖revision`) + unique constraint `uq_billing_documents_idempotency` |
| 7 | Triggers imutabilidade | ✅ | `prevent_issued_billing_document_mutation()` + `prevent_issued_billing_lines_mutation()` bloqueiam UPDATE/DELETE de docs `issued/paid/credited/cancelled` |
| 8 | Logs sanitizados | ✅ | `_shared/billing/logs.ts` + `sanitize.ts` removem authorization/token/api_key/password recursivo |
| 9 | Adapter pattern | ✅ | `BillingProvider` interface + 5 adapters (Manual 100%, Moloni com OAuth refresh, KeyInvoice/InvoiceXpress/Vendus stubs seguros) |
| 10 | `testConnection` sem credenciais devolve `not_configured` | ✅ | `StubAdapter` e `ProviderFactory` respeitam contrato |
| 11 | Permissões granulares `billing.*` | ✅ | 8 chaves (`view, configure, prepare, issue, cancel, credit_note, sync, view_logs`) em `member_module_permissions`, seed para owner/admin |
| 12 | ManualExportAdapter 100% funcional | ✅ | Exporta PDF/CSV/JSON sem chamada externa |
| 13 | Bloqueio de duplicação por idempotency | ✅ | `billing-issue-document` verifica `(empresa_id, source_type, source_id, document_type) + idempotency_key` antes de chamar adapter |
| 14 | UI: definições + tab Faturação | ✅ | `/empresa/definicoes/faturacao` + tab "Faturação" em `/obras/:id` |
| 15 | Modo manual exportação banner | ✅ | `BillingDocumentReview` + `ObraFaturacaoTab` mostram alerta amarelo |
| 16 | Módulos existentes intactos | ✅ | Nenhuma alteração em Obras/Orçamentos/Autos/Folha de Fecho/Budget/Forecast/Outturn/Financeiro/Clientes/Empresas |

---

## 3. Fora de âmbito (mantido fora intencionalmente)

- OAuth interativo por utilizador (Moloni continua via "colar tokens" pelo admin).
- Criação automática de contas a receber (sincronização financeira é responsabilidade do módulo `financeiro` existente; ligar manualmente quando necessário).
- SAFT/ATCUD/assinatura fiscal — responsabilidade do provider externo.
- Credenciais sandbox dos providers reais — quando o cliente fornecer, basta inserir em `/empresa/definicoes/faturacao` e o adapter passa de stub para chamada real.

---

## 4. Próximos passos sugeridos (não bloqueantes)

1. Quando o primeiro cliente fornecer credenciais sandbox reais de um provider (Moloni/InvoiceXpress/etc.), retirar o stub e ativar o caminho real do adapter respetivo.
2. Adicionar botão "Preparar fatura" dentro de Auto de Medição aprovado / Folha de Fecho aprovada para gerar pre-document automaticamente (apenas chama `billing-prepare-document`).
3. Webhook receiver `billing-webhook-{provider}` quando o cliente ativar notificações push de status pelo provider.
