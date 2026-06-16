
# Billing Integration Layer — Plano Final

Camada nova, opcional e isolada para integração futura com KeyInvoice, InvoiceXpress, Moloni, Vendus e modo manual_export. **Não emite faturação fiscal própria**. Não altera Obras, Orçamentos, Autos, Folha de Fecho, Budget, Forecast, Outturn, Financeiro, Clientes ou Empresas — apenas lê dados aprovados.

## Decisões fechadas (incorporadas)

1. **Credenciais** → Supabase Vault. `billing_integrations` guarda apenas `vault_secret_id` (uuid) e metadata; nada de pgsodium nem função SQL custom.
2. **Moloni OAuth** → sem fluxo interativo; admin cola tokens. Adapter implementa refresh automático, rotação no Vault, `token_expires_at`, e erro amigável `AUTH_EXPIRED` quando revogado.
3. **Permissões** → reutilizar `member_module_permissions`. Novo módulo `billing` com 8 chaves (`billing.view`, `.configure`, `.prepare`, `.issue`, `.cancel`, `.credit_note`, `.sync`, `.view_logs`).
4. **Providers** → `ManualExportAdapter` 100% funcional. Os outros 4 têm interface completa + stubs seguros; `testConnection` devolve `not_configured` sem credenciais e teste real só quando configurado.

---

## Fase 1 — Fundação BD, Vault, RLS, Permissões

Migração única, idempotente, com `GRANT` + `RLS` + policies para cada tabela nova.

### Tabelas em `public`

- **`billing_integrations`** — `empresa_id`, `organization_id`, `provider`, `environment`, `status`, `is_active`, `name`, `api_base_url`, `account_id`, `organization_external_id`, `settings_json`, `vault_secret_id uuid` (referência ao secret no Vault que guarda `{api_key|access_token|refresh_token|...}` em JSON), `token_expires_at`, `last_connection_test_at`, `last_sync_at`, auditoria.
- **`billing_customers`** — mapa cliente interno ↔ externo do provider.
- **`billing_documents`** — pré-fatura interna + ligação ao doc externo; com `idempotency_key`, `credited_document_id`, `internal_status`/`external_status`.
- **`billing_document_lines`** — linhas congeladas (qtd, preço, IVA, retenção, totais).
- **`billing_sync_logs`** — payloads sanitizados, `operation`, `status`, `http_status`, `retry_count`, `idempotency_key`.

Índices conforme spec (incluindo `uq_billing_documents_idempotency`, `uq_billing_documents_external`, `uq_billing_integrations_active_provider`).

### RLS

- Policies por `organization_id` usando funções `SECURITY DEFINER` já existentes no projeto (padrão `is_org_member()` / `has_role()`), evitando recursão.
- `billing_integrations`: SELECT mascara `vault_secret_id` no client via view `billing_integrations_safe` (SECURITY INVOKER) — frontend lê apenas a view; UPDATE/INSERT requer `billing.configure`.
- `billing_sync_logs`: SELECT requer `billing.view_logs`; INSERT só via `service_role` (edge functions).
- GRANTs: `SELECT,INSERT,UPDATE,DELETE TO authenticated`, `ALL TO service_role`, sem `anon`.

### Triggers

- `update_updated_at` em todas.
- `prevent_issued_billing_document_mutation()` bloqueia alteração de `cliente_id|source_id|document_type|total` quando `internal_status ∈ (issued,paid,partially_paid,credited,cancelled)`.
- Trigger BEFORE DELETE bloqueando remoção de docs emitidos.

### Permissões

- Inserir módulo `billing` com as 8 chaves em `member_module_permissions` (seed) seguindo padrão de `src/components/team/ModulePermissionsGrid.tsx` e `src/types/team.ts`.
- Mapeamento de roles default:
  - Admin empresa → todas.
  - Financeiro → `view, prepare, issue, credit_note, sync, view_logs`.
  - Gestor obra → `view, prepare`.
  - Comercial/operacional → `view`.
  - Fornecedor/cliente portal → nenhuma.

### Vault

- Helper SQL `billing_vault_put(p_integration_id uuid, p_payload jsonb)` / `billing_vault_get(p_integration_id uuid)` — `SECURITY DEFINER`, só chamável por edge functions (revoke `authenticated`), grava no `vault.secrets` e devolve `secret_id`.
- Frontend nunca chama Vault. Toda leitura/escrita de credenciais passa por edge function.

---

## Fase 2 — Edge Functions e Adapters

### Estrutura partilhada

```
supabase/functions/_shared/billing/
  sanitize.ts                  # remove authorization/token/api_key/password recursivo
  vault.ts                     # wrappers billing_vault_put/get via service_role
  permissions.ts               # checkPermission(userId, empresaId, key)
  zod-schemas.ts
  providers/
    BillingProvider.ts         # interface canónica da spec §5
    ProviderFactory.ts
    KeyInvoiceAdapter.ts       # stub seguro + testConnection real quando configurado
    InvoiceXpressAdapter.ts    # idem
    MoloniAdapter.ts           # idem + refresh automático + rotação no Vault
    VendusAdapter.ts           # idem
    ManualExportAdapter.ts     # 100% funcional (gera PDF interno, CSV, JSON)
```

Stubs devolvem erros tipados (`not_implemented`, `not_configured`) sem nunca tentar chamada externa sem credenciais.

### Edge Functions (todas com Zod, CORS, `getClaims`, validação de tenant e permissão, sanitização de logs)

1. `billing-test-connection` — `billing.configure`.
2. `billing-create-or-update-customer` — `billing.prepare`/`issue`.
3. `billing-prepare-document` — `billing.prepare`. **Recalcula tudo no backend** a partir das tabelas-fonte (orçamento/auto/folha-fecho/...); ignora valores vindos do frontend; gera `idempotency_key = sha256(empresa_id || source_type || source_id || document_type || revision)`.
4. `billing-issue-document` — `billing.issue`. Verifica duplicação por `(empresa_id, source_type, source_id, document_type)` + `idempotency_key` antes de chamar adapter; persiste `external_*` no sucesso.
5. `billing-sync-document-status` — `billing.sync`.
6. `billing-get-document-pdf` — `billing.view`.
7. `billing-create-credit-note` — `billing.credit_note`.

Cada função: input Zod, mensagens de erro amigáveis com `code` (ex.: `CUSTOMER_MISSING_NIF`), log sanitizado em `billing_sync_logs`.

---

## Fase 3 — UI

### Definições da Empresa (rota nova `/empresa/definicoes/faturacao`)

- `BillingIntegrationSettings.tsx` — escolher provider + ambiente, inserir credenciais (write-only, vão direto para Vault via edge function, nunca persistem em estado), botão "Testar Ligação", botão "Ativar".
- Banner permanente: *"O Obra Sys não emite faturação fiscal própria. A emissão fiscal oficial é feita pelo provider externo configurado."*
- Mostra apenas estado, provider, ambiente, `last_connection_test_at`, `token_expires_at` (quando aplicável).
- Painel `BillingSyncLogsPanel.tsx` (collapsible) visível com `billing.view_logs`.

### Dentro da Obra (nova tab "Faturação")

- `BillingDocumentsList.tsx` — lista com `BillingDocumentStatusBadge.tsx` (interno + externo).
- `BillingDocumentReview.tsx` — modal obrigatório antes de emitir, com checkbox de confirmação explícita.
- Botões dinâmicos por estado: antes de `issued` → Editar/Apagar/Emitir; após `issued` → só Sincronizar, Obter PDF, Nota de Crédito, Ver Logs.
- Modo `manual_export` → botões "Exportar PDF / CSV / JSON" com banner: *"Não constitui documento fiscal oficial."*

### Hooks (`src/modules/billing/hooks/`)

`useBillingIntegrations`, `useBillingDocuments`, `usePrepareBillingDocument`, `useIssueBillingDocument`, `useSyncBillingDocument`, `useCreateBillingCreditNote`, `useBillingSyncLogs`. Todos via `supabase.functions.invoke` — zero chamadas externas no browser.

---

## Fase 4 — Hardening e Aceitação

- Testes via `supabase--curl_edge_functions` (sandbox) por cada função.
- E2E completo do `ManualExportAdapter` (único 100% funcional).
- Verificação RLS cross-tenant.
- Verificação permissões (403 sem `billing.issue`).
- Verificação idempotência (2x emit → 1 doc).
- Verificação triggers (UPDATE/DELETE em `issued` falha).
- Checklist dos 16 critérios da spec §15.

---

## Fora desta fase

- Per-user OAuth interativo (Moloni passa por colar tokens).
- Criação automática de contas a receber.
- SAFT / ATCUD / assinatura fiscal.
- Alteração de qualquer módulo existente.

---

Pronto para começar pela Fase 1 (migração isolada para revisão). Confirme para avançar.
