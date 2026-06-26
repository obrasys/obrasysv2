# Auditoria Técnica — Obra Sys

> Data: 26-06-2026 · Modo: somente leitura (nenhum ficheiro foi alterado).
> Fontes: linter Supabase, scanners de segurança Lovable/Wiz, `pg_stat_statements`, inspeção estática de `src/` (829 ficheiros TS/TSX) e `supabase/functions/` (69 funções).

---

## A. Resumo executivo

A plataforma está **funcionalmente madura e segura na base** (RLS ativa em 100% das 263 tabelas `public`, scanners sem findings abertos, MFA, super-admin via tabela própria, multi-tenant por `organization_id`). Os riscos concentrados estão em três frentes:

1. **Performance de leitura de `obras` / `orcamentos`** — a mesma query repete-se dezenas de milhares de vezes (até 29 mil chamadas) por falta de filtro por `organization_id` no PostgREST e por ausência de índices compostos. É hoje o maior gargalo.
2. **Superfície de Edge Functions com `verify_jwt = false`** (≈15 funções) — várias delas tocam dados sensíveis (billing, recalculate-prices, admin-user-actions) e dependem de validação manual no handler. Auditável caso a caso.
3. **Dívida técnica acumulada no frontend** — 492 ocorrências de `: any`, ficheiros monolíticos (>1.000 linhas em `Editar.tsx`, `Essencial.tsx`, `ClosingSheetFullView.tsx`, `Detail.tsx` de plantas), e 153 `console.log` ainda no código de produção.

Nenhum problema **crítico de segurança** está aberto neste momento, mas há **3 riscos altos** que devem ser corrigidos antes da próxima campanha de marketing/escala.

---

## B. Principais riscos encontrados (Top 10)

| # | Risco | Severidade | Pode quebrar? |
|---|---|---|---|
| 1 | Queries sem índice em `obras(arquivada, status, created_at)` e `orcamentos(obra_id)` causam ~10 minutos/dia de CPU PostgREST | **Alto** | Não (degradação) |
| 2 | 12 Edge Functions sem qualquer referência a `Authorization`/`auth.getUser` no handler | **Alto** | Sim, se RLS via service-role |
| 3 | `supabase/config.toml` com `verify_jwt=false` em funções sensíveis (recalculate-prices, admin-user-actions, validate-budget-ai) | **Alto** | Não |
| 4 | `src/integrations/supabase/types.ts` com 18.470 linhas — tempo de build/tsgo elevado e risco de OOM em CI | **Médio** | Não |
| 5 | Páginas monolíticas (>1.000 linhas) dificultam revisão, testes e introduzem re-renders globais | **Médio** | Não |
| 6 | 492 `: any` no código TS — perda de garantias do compilador, propagação silenciosa de bugs | **Médio** | Não |
| 7 | 4 buckets públicos com listagem aberta (linter `0025`) — informação de branding/PDF pode ser enumerada | **Médio** | Não |
| 8 | Vários `SECURITY DEFINER` executáveis por `anon` (linter `0028`) — intencional para `has_role`/`is_super_admin`, mas há funções a mais expostas | **Médio** | Sim, se revogadas sem cuidado |
| 9 | `mfa_verified` persistido em `sessionStorage` — não é validado no servidor; um atacante com XSS pode pular MFA na sessão | **Alto** | Não |
| 10 | 153 `console.log/warn/error` em produção podem vazar IDs internos no DevTools dos clientes | **Baixo** | Não |

---

## C. Problemas críticos

Não foram identificados problemas **críticos** abertos (RLS desativada, chaves expostas, endpoints administrativos sem auth, etc.). O ambiente está em estado **"seguro mas otimizável"**.

> ⚠️ Considera-se *crítico* apenas o que permite ler/escrever dados de outro tenant, ler dados sensíveis sem login, ou bloquear funcionalidade central. Os itens da secção B-1 a B-3 são **Alto**, não Crítico.

---

## D. Problemas por módulo

### D.1 Arquitetura geral
- **131 hooks** em `src/hooks/` — falta de agrupamento por domínio (todos no mesmo nível). Sugerir `hooks/orcamentos/`, `hooks/obras/`, etc.
- `src/pages` repete a estrutura mas a separação **page ↔ component ↔ hook ↔ service** está difusa: muitos componentes têm fetch direto, outros via hook. Inconsistência.
- Ausência de `services/` dedicado. Lógica de domínio frequentemente misturada em componentes (`Essencial.tsx`, `Editar.tsx`).
- 69 edge functions sem README/índice — risco de duplicação (ex.: `axia-*` tem 12 funções com responsabilidades sobrepostas).

**Severidade:** Médio. **Quebra?** Não.

### D.2 Banco de dados e Supabase
- 263 tabelas em `public`. **100% com RLS ativa** ✅.
- Tabelas mais "quentes": `artigos_orcamento` (5.072 linhas), `base_artigos_user` (4.504), `org_zone_area_defaults` (4.379). Verificar índices nos `FK` mais usados.
- Existem **tabelas potencialmente redundantes**: `org_service_suggestions` vs `org_service_type_suggestions`, `org_zone_library` vs `org_zone_area_defaults`. Validar se ambas estão em uso.
- `survey_tokens` com 1.729 linhas — sem rotina de expiração visível.
- `member_module_permissions` (1.167) — verificar se há limpeza ao remover membro.
- Falta de `CHECK` constraints em vários enums (status, estados de obra) — armazenados como `TEXT`.

**Severidade:** Médio. **Quebra?** Não.

### D.3 Segurança
- **0 findings abertos** nos 5 scanners (Lovable, Wiz, Supabase, agent_security, supply_chain).
- 12 edge functions **sem qualquer referência** a verificação de Authorization (lista completa abaixo). Devem ser auditadas uma a uma:
  - billing-* (9 funções): assumem que o cliente envia identificadores válidos
  - check-receivable-alerts, recalculate-prices, stripe-webhooks (stripe legitimamente sem JWT, mas precisa de validação de assinatura)
- **MFA persistido em sessionStorage** sem verificação server-side em cada request — XSS bypass possível.
- 4 buckets públicos com listagem aberta (linter WARN).
- Funções `SECURITY DEFINER` executáveis por `anon` — algumas intencionais (`is_super_admin`, `has_role`), outras a revisar.

**Severidade:** Alto. **Quebra?** Correção dos buckets pode quebrar previews.

### D.4 Performance
**Top queries por tempo total (24h-ish):**
1. `SELECT obras (id,nome,cliente,status) WHERE arquivada AND status=…` — **29.247 chamadas / 209s totais / max 1s**
2. `SELECT obras + LEFT JOIN LATERAL orcamentos` — **9.817 chamadas / 179s / max 1.3s**
3. Mesma query com `status = ANY(...)` — **6.921 chamadas / 128s**

**Causas:**
- Falta de índice composto `(arquivada, status, created_at DESC)` em `obras`.
- `obra_id` em `orcamentos` provavelmente sem índice (LATERAL fica lento).
- Re-fetches no cliente: vários componentes fazem o mesmo `useObras()` em paralelo sem reaproveitar React Query cache.
- `src/integrations/supabase/types.ts` (18k linhas) → tempo de typecheck elevado.

**Severidade:** Alto. **Quebra?** Não, índices são seguros.

### D.5 Módulo Orçamentos
- `Essencial.tsx` (1.069 linhas) e `Editar.tsx` (1.138 linhas) precisam decomposição.
- `ArtigoForm.tsx` (969 linhas) concentra criação inline de zonas, áreas, tipologias, IVA — alta complexidade ciclomática.
- Possível desalinhamento entre `artigos_orcamento` (43 colunas) e `budget_version_items` (29 colunas) — não está claro qual é a fonte de verdade para versionamento.
- Cálculo de margem `PV = Custo / (1 - Margem%)` correto e testado (`margin.test.ts`).
- IVA com regiões (Continente/Madeira/Açores) implementado, mas **não há testes** para `iva-regions.ts`.
- PDF: 3 geradores (`orcamento-pdf`, `orcamento-pdf-comercial`, `orcamento-pdf-zonas`) com lógica duplicada — risco de divergência entre versões.

**Severidade:** Médio. **Quebra?** Refactor pode regredir PDF se sem testes visuais.

### D.6 Módulo Planta/ICF
- `Detail.tsx` plantas (1.843 linhas) e `PlanViewer.tsx` (1.080) são os componentes mais pesados do projeto.
- Pipeline de leitura assistida usa Gemini (`plant-leitura-analyze`, `axia-plan-vision`, `axia-electrical-analysis`) — **sem limites de tamanho de PDF visíveis no client** → risco de timeout / custo descontrolado.
- Falta retry idempotente em `plant-leitura-autofix` (uma falha do LLM apaga o batch).
- `icf_panos_parede` (430 linhas) com 27 colunas — algumas calculáveis (volume, área líquida) poderiam ser GENERATED COLUMNS.
- Não há rate-limiting por organização nas chamadas Axia.

**Severidade:** Médio. **Quebra?** Não.

### D.7 Módulo Obras
- Queries dominantes do PostgREST (ver D.4) vêm deste módulo.
- Falta de **paginação real** — `LIMIT/OFFSET` aplicado pelo PostgREST mas a UI carrega "tudo" e filtra no cliente.
- `obra_progress_tracking` tem 8 policies — auditar se não há sobreposição (custo de avaliação).
- RDOs e Daily Reports duplicam conceitos (`relatorios_diarios` 20 col vs `daily_reports` 28 col).

**Severidade:** Alto (perf) / Médio (modelagem). **Quebra?** Consolidar tabelas pode quebrar UI.

### D.8 Módulo Financeiro
- `financial_work_cycles` + `financial_work_documents` + `financial_work_lines` + `closing_sheets` + `financial_milestones` — modelo rico, mas **6+ tabelas** para um único ciclo. Necessária documentação ER.
- `useFinanceiro`, `useFinancialCycles`, `useFinancialMilestones`, `useFinancialExtras` — quatro hooks para a mesma área, alta probabilidade de fetches sobrepostos.
- Trigger de sync entre `receivables` e `receivable_payments` precisa validação de idempotência.
- Folha de fecho: `ClosingSheetFullView.tsx` é o maior componente do projeto (2.192 linhas) — **prioritário** dividir.

**Severidade:** Médio. **Quebra?** Sim, se mexer em totalizadores sem snapshot.

### D.9 Clientes e Fornecedores
- `useSuppliers.ts` (955 linhas) concentra demasiado.
- `supplier_profiles` (51 colunas) e `fornecedores` (20 colunas) — dois conceitos paralelos. Sugerir consolidação documentada.
- Convites de fornecedor: `supplier_invites` sem TTL claro.
- `supplier_reviews` recentemente restringido (já corrigido em sprint anterior).

**Severidade:** Médio.

### D.10 Documentos
- `documentos`, `budget_documents`, `icf_project_documents`, `plant_files` — 4 sistemas de ficheiros distintos sem abstração comum.
- Falta de scan antivírus em uploads (esperado para B2B).
- Sem versionamento explícito de documentos contratuais.

**Severidade:** Médio.

### D.11 IA Axia
- 12 edge functions `axia-*` + 4 funções de análise específica (icf, plant, billing). Falta um **inventário de prompts** centralizado.
- Prompts longos hard-coded em TSX (ex.: `IcfAxiaAnalysisPanel.tsx`) — dificulta auditoria e A/B testing.
- `axia_ai_logs` existe (1 policy), mas verificar se **todas** as chamadas escrevem log com `organization_id`, custo e prompt hash.
- Não há *guardrail* visível contra PII no input (NIF, IBAN podem ir para LLM).
- Streaming via SSE implementado, mas sem cancelamento abortável em vários painéis.

**Severidade:** Alto (compliance LGPD/RGPD). **Quebra?** Não.

### D.12 UI/UX
- Boa base shadcn + tokens semânticos em `index.css`.
- Inconsistência em **estados vazios** (alguns têm ilustração + CTA, outros só texto).
- Modais profundos no orçamento essencial (ArtigoForm dentro de Wizard) — fluxo confuso em mobile (relatado pelo utilizador em sprints anteriores).
- Nenhum sistema visível de toasts categorizados (sucesso/aviso/erro com semântica).
- Dark mode não testado em todos os módulos novos (ICF e Plantas).

**Severidade:** Médio.

### D.13 Stripe e planos
- 3 funções Stripe (`create-checkout`, `customer-portal`, `stripe-webhooks`) — `verify_jwt=false` correto para webhooks; resto valida `auth.getUser` internamente (✅).
- **Gate de plano** distribuído por `useFeatureGate` + `useSubscription` + `useCanSendPlanToBudget` — auditar consistência.
- Cancelamento e downgrade não têm fluxo de *grace period* visível.
- Cupons globais aplicados via workaround documentado em memória.

**Severidade:** Médio.

### D.14 Integrações futuras
- Camada `billing/` já está modular (Moloni/InvoiceXpress-ready), com `BillingIntegrationSettings` e `billing_integrations`.
- Falta abstração genérica `ExternalIntegration` reutilizável.
- Meteorologia, OCR e leitura de ficheiros: pipelines existem mas não há *fallback chain* documentado.

**Severidade:** Baixo.

---

## E. Problemas de segurança (síntese)

| ID | Item | Severidade |
|---|---|---|
| S-01 | MFA verificado apenas em `sessionStorage` | Alto |
| S-02 | 12 Edge Functions sem `Authorization` aparente | Alto |
| S-03 | Buckets públicos com listagem aberta (4×) | Médio |
| S-04 | `SECURITY DEFINER` executável por `anon` (revisar lista) | Médio |
| S-05 | PII potencialmente enviada a LLMs (NIF, IBAN, salários) | Alto (RGPD) |
| S-06 | 153 `console.log` em produção | Baixo |
| S-07 | Ausência de rate-limit nas chamadas Axia | Médio |

---

## F. Problemas de performance

| ID | Item | Impacto |
|---|---|---|
| P-01 | `obras` sem índice composto `(arquivada, status, created_at)` | Alto |
| P-02 | `orcamentos.obra_id` provavelmente sem índice — LATERAL lento | Alto |
| P-03 | Múltiplos `useObras()` independentes (sem dedupe React Query) | Médio |
| P-04 | `types.ts` 18k linhas → typecheck/build lentos | Médio |
| P-05 | Componentes monolíticos (>1.000 linhas) → re-render global | Médio |
| P-06 | Edge functions Axia sem timeout/quotas explícitas | Médio |

---

## G. Problemas de banco de dados / RLS

- ✅ 263/263 tabelas com RLS.
- ⚠️ `obra_progress_tracking` com **8 policies** — risco de policy explosion.
- ⚠️ Tabelas paralelas: `daily_reports` ↔ `relatorios_diarios`, `org_service_suggestions` ↔ `org_service_type_suggestions`, `org_zone_library` ↔ `org_zone_area_defaults`, `supplier_profiles` ↔ `fornecedores`.
- ⚠️ Enums armazenados como TEXT em vários sítios (status de obra, status de orçamento).
- ⚠️ `survey_tokens` sem TTL automático.
- ✅ `is_super_admin()`, `has_role()`, `get_user_org_id()` deterministas e usados nas policies.

---

## H. Problemas de UX/UI

1. Modal-dentro-de-modal no Orçamento Essencial em mobile.
2. Estados vazios inconsistentes.
3. Falta de breadcrumbs em rotas profundas (ICF/Plantas).
4. Dashboards com KPIs sem skeletons consistentes.
5. Mensagens de erro técnicas expostas (ex.: "JWT expired" em toast).
6. Onboarding gamificado existe mas não cobre módulos novos (ICF, Plantas).

---

## I. Dívida técnica

| ID | Item |
|---|---|
| DT-01 | 492 ocorrências de `: any` |
| DT-02 | Páginas/componentes monolíticos: `ClosingSheetFullView` 2.192L, `plantas/Detail` 1.843L, `orcamentos/Editar` 1.138L, `PlanViewer` 1.080L, `orcamentos/Essencial` 1.069L, `IcfAssistenteArquitetura` 997L, `ArtigoForm` 969L, `useSuppliers` 955L |
| DT-03 | 3 geradores de PDF de orçamento com lógica duplicada |
| DT-04 | 4 sistemas de ficheiros (documentos/budget/icf/plant) sem abstração comum |
| DT-05 | 12+ funções `axia-*` com prompts hard-coded |
| DT-06 | `useFinanceiro` × `useFinancialCycles` × `useFinancialMilestones` × `useFinancialExtras` — overlap |
| DT-07 | 153 `console.log` em produção |
| DT-08 | 4 testes E2E apenas (`*.test.tsx`/`.e2e.test.ts`); cobertura real <5% |

---

## J. Melhorias recomendadas

1. **Performance imediata:** adicionar índices em `obras` e `orcamentos.obra_id`. Centralizar `useObras` numa só fonte React Query.
2. **Hardening de Edge Functions:** auditoria função-a-função das 12 sem `Authorization`; adicionar `requireUser()` helper compartilhado em `_shared/`.
3. **MFA server-side:** validar a flag em cada request via cookie httpOnly assinado, não `sessionStorage`.
4. **Quebra de monólitos:** dividir os 8 ficheiros >900L em sub-componentes + extrair hooks.
5. **Inventário de prompts Axia:** mover prompts para `supabase/functions/_shared/prompts/*.md` ou tabela versionada.
6. **PII filter** antes de cada chamada LLM (regex NIF, IBAN, salário; anonimizar).
7. **Limpeza:** remover `console.log` via lint rule (`no-console` exceto warn/error).
8. **Documentação ER**: gerar diagrama financeiro e de orçamentos.
9. **Consolidação de tabelas paralelas** após validar uso real.
10. **Testes:** alvo mínimo de 25% em hooks de cálculo (margem, IVA, EAC, folha de fecho).

---

## K. Correções prioritárias (ordem sugerida)

| Ordem | Tarefa | Risco se adiar |
|---|---|---|
| 1 | Índices em `obras(arquivada,status,created_at)` e `orcamentos(obra_id)` | Alto — degrada com crescimento |
| 2 | Auditar 12 edge functions sem `Authorization` | Alto — possível leak |
| 3 | MFA server-side check | Alto — bypass via XSS |
| 4 | PII filter Axia + rate-limit | Alto — RGPD |
| 5 | Limpar `console.log` + adicionar `no-console` | Baixo |
| 6 | Dividir `ClosingSheetFullView` (2.192L) | Médio — bloqueia evolução |
| 7 | Consolidar geradores PDF orçamento | Médio — divergência |
| 8 | Documentar/consolidar tabelas paralelas | Médio |
| 9 | Bucket público → assinado, ou justificar | Médio |
| 10 | Testes para `iva-regions`, EAC, fechamento | Médio |

---

## L. Plano de ação em fases (proposta)

**Fase 1 — Performance crítica (1 sprint, baixo risco)**
- Índices SQL, dedup de fetches, ajustes React Query.
- Resultado esperado: -70% no tempo PostgREST.

**Fase 2 — Hardening segurança (1 sprint)**
- `requireUser()` helper, MFA server-side, PII filter Axia, rate-limit, limpeza `console.log`.

**Fase 3 — Quebra de monólitos (2 sprints)**
- ClosingSheetFullView, plantas/Detail, orcamentos/Editar+Essencial, ArtigoForm.

**Fase 4 — Consolidação de modelo (2 sprints)**
- Documentar ER, validar tabelas paralelas, marcar deprecadas, unificar geradores de PDF.

**Fase 5 — Cobertura de testes + observabilidade (contínuo)**
- Testes de cálculo financeiro/fiscal; dashboard de logs Axia com custo por org.

---

## M. ⚠️ NÃO alterar sem validação humana explícita

1. **RLS de `obras`, `orcamentos`, `organizations`, `organization_members`, `user_roles`, `super_admins`** — qualquer mudança pode isolar tenants ou abrir cross-tenant leak.
2. **`handle_new_user` trigger** — provisiona organização; alteração quebra registro de novos utilizadores.
3. **Trigger de role self-update protection** e função `is_super_admin()`.
4. **Edge function `stripe-webhooks`** — assinatura webhook; modificar sem replay quebra cobrança.
5. **`mfa_otp_codes`, `mfa_trusted_devices`** — fluxo 2FA já corrigido recentemente.
6. **Geradores PDF** — sem testes visuais, qualquer refactor regride layouts em produção.
7. **`artigos_orcamento` ↔ `budget_version_items`** — relação central de versionamento; consolidar só após snapshot de teste.
8. **`accept_my_pending_invitations` RPC** — usado no AuthContext, qualquer mudança quebra onboarding de membros.
9. **`supplier_profiles_marketplace` view** — corrige finding histórico; manter `security_invoker = on`.
10. **`config.toml`** — flags `verify_jwt` foram afinadas caso a caso; mudar em massa pode bloquear webhooks ou expor endpoints.

---

> Fim do relatório. Aguarda autorização explícita para avançar para o plano de correção ou modificar qualquer ficheiro.
