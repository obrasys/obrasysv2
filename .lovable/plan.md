# Plano de Correção — Obra Sys

Plano sequencial baseado na auditoria de 26-06-2026. Cada fase é independente, com gate de validação antes da seguinte. Nenhuma fase entra em produção sem checklist concluído.

---

## Princípios de execução (aplicam-se a todas as fases)

- **Branch/preview primeiro**: cada fase é validada em preview antes de publicar.
- **Migrações reversíveis**: toda migração tem rollback documentado.
- **Snapshot antes de mexer**: tabelas críticas (`obras`, `orcamentos`, `artigos_orcamento`, `closing_sheets`, `financial_*`) recebem `pg_dump` lógico parcial antes de qualquer ALTER.
- **Sem refactor + feature na mesma PR**.
- **Lista do anexo M da auditoria é intocável** sem aprovação explícita por item.

---

## FASE 0 — Preparação (0,5 sprint, risco zero)

Objetivo: criar a rede de segurança antes de qualquer correção.

1. Ativar `pg_stat_statements` dashboard semanal.
2. Criar helper `supabase/functions/_shared/requireUser.ts` (sem aplicar ainda).
3. Adicionar `eslint-plugin-no-console` em modo `warn` (sem falhar build).
4. Configurar exports CSV dos 5 top-queries para baseline de performance.
5. Snapshot lógico de `obras`, `orcamentos`, `artigos_orcamento`, `closing_sheets`.

**Gate:** baseline de performance e backups confirmados.

---

## FASE 1 — CRÍTICO/ALTO: Performance de leitura (1 sprint)

Maior ganho com menor risco. Apenas índices e dedupe de cache, sem mudar contratos.

1. **Migração SQL** (única, com rollback):
   - `CREATE INDEX CONCURRENTLY ix_obras_arquivada_status_created ON obras (arquivada, status, created_at DESC);`
   - `CREATE INDEX CONCURRENTLY ix_obras_org_arquivada ON obras (organization_id, arquivada);`
   - `CREATE INDEX CONCURRENTLY ix_orcamentos_obra_id ON orcamentos (obra_id);`
   - `CREATE INDEX CONCURRENTLY ix_artigos_orc_capitulo ON artigos_orcamento (capitulo_id);`
   - `ANALYZE` nas 4 tabelas.
2. Centralizar `useObras` numa única fonte React Query (`staleTime: 30s`, `gcTime: 5min`). Remover fetches duplicados em Dashboard/Sidebar.
3. Adicionar `select` específicos no PostgREST (cortar `obras.*` por colunas necessárias).
4. Re-executar slow_queries após 48h; comparar com baseline.

**Esperado:** -60% a -80% tempo total em `obras`. **Risco de quebra:** nulo.

---

## FASE 2 — ALTO: Hardening de segurança (1 sprint)

Sem mudar comportamento funcional, apenas adicionar verificações.

1. Aplicar `requireUser()` nas 12 edge functions identificadas (`billing-*`, `check-receivable-alerts`, `recalculate-prices`). Stripe-webhooks mantém JWT off mas reforçar verificação de assinatura.
2. **MFA server-side**:
   - Criar coluna `mfa_verified_at` em `user_mfa_settings`.
   - RPC `verify_mfa_session()` que valida cookie httpOnly assinado.
   - Frontend mantém `sessionStorage` como cache mas **revalida** a cada navegação para rota sensível.
3. **PII filter Axia**: helper `_shared/scrubPII.ts` (regex NIF, IBAN, cartão, salário) aplicado antes de cada `axia-*`.
4. **Rate-limit Axia**: tabela `axia_rate_limits (org_id, window_start, calls)` + check antes da chamada.
5. Buckets públicos: trocar política de listagem por leitura por path (`logos/*`, `branding/*` continuam públicos por path; bloquear `LIST`).
6. Remover `console.log` em produção via lint `error` (manter `warn/error`).

**Esperado:** 0 findings repetidos no próximo scan. **Risco:** baixo; ativar feature flag por função.

---

## FASE 3 — MÉDIO: Estabilização de módulos críticos (1 sprint)

Sem alterar UX visível, apenas reduzir superfície de risco.

1. **Consolidar geradores PDF** (`orcamento-pdf`, `*-comercial`, `*-zonas`) num motor único parametrizado. Testes de snapshot por modo antes de remover os antigos.
2. **Testes mínimos** para cálculos sensíveis:
   - `iva-regions.ts` (Continente/Madeira/Açores).
   - Folha de fecho (EAC, desvios).
   - Trigger de sync `receivables ↔ receivable_payments`.
3. Centralizar prompts Axia em `supabase/functions/_shared/prompts/*.md` + log obrigatório em `axia_ai_logs` com `organization_id`, custo estimado e hash do prompt.

**Risco:** Médio — só publicar PDF unificado após paridade visual confirmada.

---

## FASE 4 — MÉDIO: Quebra de monólitos (2 sprints)

Refactor puro, sem nova funcionalidade. Um ficheiro por PR.

Ordem (do mais isolado para o mais acoplado):
1. `useSuppliers.ts` (955 L) → dividir por domínio (CRUD, invites, reviews).
2. `ArtigoForm.tsx` (969 L) → extrair `ZoneAreaSelector`, `IvaSelector`, `CostBreakdown`.
3. `IcfAssistenteArquitetura.tsx` (997 L) → separar steps do wizard.
4. `orcamentos/Essencial.tsx` (1.069 L) → separar wizard, preview e save.
5. `PlanViewer.tsx` (1.080 L) → extrair camadas Konva.
6. `orcamentos/Editar.tsx` (1.138 L) → idem Essencial.
7. `plantas/Detail.tsx` (1.843 L) → painéis em rotas filhas.
8. `ClosingSheetFullView.tsx` (2.192 L) — **último**, mais acoplado a finanças.

Cada PR: tamanho-diff <800 linhas, sem alteração de tipos públicos, com snapshot de UI.

**Risco:** Médio. Mitigação: feature flag por componente reformado.

---

## FASE 5 — MÉDIO: Consolidação de modelo de dados (2 sprints)

Só após Fase 1 estabilizar.

1. Documentar ER de financeiro e orçamentos (`docs/er-*.md`).
2. Auditar uso real (queries 30 dias) das tabelas paralelas:
   - `daily_reports` ↔ `relatorios_diarios`
   - `org_service_suggestions` ↔ `org_service_type_suggestions`
   - `org_zone_library` ↔ `org_zone_area_defaults`
   - `supplier_profiles` ↔ `fornecedores`
3. Marcar a tabela perdedora como `DEPRECATED` (view de compatibilidade), nunca DROP imediato. DROP só após 1 sprint sem leituras.
4. Converter enums TEXT em tipos `enum` Postgres onde estável.
5. TTL automático em `survey_tokens` (cron edge function ou trigger).

**Risco:** Alto se DROP precipitado. Mitigação: fase de view + monitorização.

---

## FASE 6 — BAIXO: UX e qualidade contínua (contínuo)

1. Padronizar estados vazios (componente `<EmptyState>`).
2. Mensagens de erro humanas (mapper de erros Supabase).
3. Breadcrumbs em ICF/Plantas.
4. Dark mode QA em módulos novos.
5. Onboarding gamificado cobrindo ICF e Plantas.
6. Subir cobertura de testes para 25% nos hooks de cálculo.
7. Dashboard de custo Axia por organização.

**Risco:** Nulo.

---

## Ordem global e dependências

```text
Fase 0 (prep)
   ↓
Fase 1 (perf) ────────────┐
   ↓                      │
Fase 2 (security)         │ podem correr em paralelo
   ↓                      │ se equipas separadas
Fase 3 (estabilizacao) ───┘
   ↓
Fase 4 (monolitos)  ←  bloqueada ate Fase 3 concluir testes
   ↓
Fase 5 (modelo de dados)  ←  bloqueada ate Fase 1 estabilizar
   ↓
Fase 6 (UX continua)
```

---

## Detalhes técnicos por fase

**Fase 1 (índices):** usar `CREATE INDEX CONCURRENTLY` fora de transação — exige migração separada e janela de baixa carga.

**Fase 2 (MFA server-side):** cookie httpOnly assinado com HMAC + `mfa_verified_at` validado por RPC `SECURITY DEFINER`. Manter `sessionStorage` apenas como cache UX, fonte da verdade no servidor.

**Fase 2 (PII filter):** regex PT: NIF `\b\d{9}\b` com check digit, IBAN `PT50\d{21}`, salário por contexto (campos `salario_*`). Substituir por `[REDACTED]` antes do prompt; nunca logar original.

**Fase 3 (PDF):** motor único recebe `mode: 'tecnico' | 'comercial' | 'zonas'` + `options`. Snapshot por jsPDF→PNG via puppeteer em CI.

**Fase 4:** cada ficheiro extraído mantém o mesmo *default export* e mesma API de props. Diff de comportamento validado por testes de render existentes + manual smoke.

**Fase 5:** views de compatibilidade `CREATE VIEW old_table AS SELECT ... FROM new_table` com `security_invoker = on`.

---

## Critérios de "pronto" por fase

| Fase | Done quando |
|---|---|
| 0 | Baselines exportados, helper criado, lint configurado |
| 1 | Top-5 queries -60% em 48h, dedupe React Query em produção |
| 2 | 0 findings críticos/altos no scan; testes de bypass MFA falham |
| 3 | PDF unificado com paridade 1:1; testes de cálculo verdes |
| 4 | 0 ficheiros >900 linhas; suite verde |
| 5 | Tabelas paralelas com 0 leituras durante 1 sprint |
| 6 | Cobertura ≥25%, lighthouse UX ≥90 |

---

## Itens explicitamente FORA deste plano

Conforme anexo M da auditoria, **não** serão modificados sem aprovação caso-a-caso:
RLS de `obras/orcamentos/organizations/user_roles/super_admins`, trigger `handle_new_user`, `is_super_admin()`, `stripe-webhooks`, fluxo MFA recentemente corrigido (`mfa_otp_codes`, `mfa_trusted_devices`), `accept_my_pending_invitations`, view `supplier_profiles_marketplace`, e flags `verify_jwt` do `config.toml` (revisão item-a-item na Fase 2).

---

Aguardo aprovação para iniciar pela **Fase 0 + Fase 1** (preparação + performance) — o par com maior ganho e menor risco.
