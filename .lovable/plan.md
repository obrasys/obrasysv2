## Axia Voice Intake — Plano de Implementação

### Adaptação ao Obra Sys (importante)
A especificação assume `companies`, `projects`, `user_company_memberships`, `daily_reports`, `financial_records`. O Obra Sys já tem equivalentes:

| Especificação | Obra Sys (real) |
|---|---|
| `companies` / `company_id` | `organizations` / isolamento via `get_org_member_ids()` + `user_id` |
| `user_company_memberships` | `organization_members` |
| `projects` | `obras` |
| `daily_reports` | `relatorios_diarios` (já existente, com `status` rascunho/submetido/aprovado) |
| `daily_report_activities` | já existe (`daily_report_activities`) ligada a `obras` |
| `financial_records` | `contas_financeiras` |
| `financial_categories` | `categorias_financeiras` |
| `clients` | `clientes` |
| `suppliers` | `fornecedores` |
| `catalog_items` | `artigos_trabalho` / `base_precos` |

Reaproveitar tabelas existentes evita duplicação, mantém o financeiro consolidado no balanço da obra (memory `logica-balanco-financeiro-consolidado`) e segue o padrão de RLS multi-tenant da plataforma (memory `multi-tenant-organization-system`). Apenas se criam tabelas novas para a camada **intake** que ainda não existe.

---

### 1. Novas tabelas (migrations)

Apenas o que é genuinamente novo:

- **`voice_commands`** — input bruto (texto/áudio), transcrição, `processing_status`, `axia_result jsonb`. Inclui `user_id` (RLS por `get_org_member_ids()`), `obra_id` opcional, `source_context`.
- **`axia_intake_items`** — rascunho normalizado por intent (`pre_budget` | `rdo` | `financial_record` | `material_need` | `unknown`), `status` (`pending_review`, `approved`, `rejected`, `converted`, `needs_more_info`), `confidence`, `missing_fields jsonb`, `axia_questions jsonb`, `target_entity_type/id` para apontar à entidade final criada.
- **`pre_budgets`** + **`pre_budget_items`** — pré-orçamento em rascunho, separado de `orcamentos` (regra: voz **nunca** cria orçamento final). Conversão `pre_budget → orcamento` é manual via UI já existente (`/orcamentos/criar`).
- **`dashboard_alerts`** — alertas operacionais (`pre_budget_pending`, `rdo_pending`, `financial_missing_project`, `axia_needs_review`).
- **`axia_processing_logs`** — auditoria de cada chamada à Axia (latência, modelo, prompt_version, status).

Reutilizadas (não criar duplicadas):
- `relatorios_diarios` ganha colunas `created_from text default 'manual'`, `source_voice_command_id uuid`, `source_axia_intake_item_id uuid`.
- `daily_report_activities` já existe — adicionar `source text`, `confidence numeric`, `voice_command_id`.
- Criar nova `daily_report_material_needs` ligada a `relatorios_diarios` (não há equivalente direto a "materiais em falta" — `daily_report_materials` é para consumos).
- `contas_financeiras` ganha `created_from`, `source_voice_command_id`, `source_axia_intake_item_id`, e o `status` passa a aceitar `pending_review` / `missing_project` / `confirmed` (campo novo `intake_status text` para não conflitar com booleano `pago`).

**RLS**: padrão da plataforma — `user_id = ANY(get_org_member_ids())` para SELECT/UPDATE; INSERT exige `user_id = auth.uid()`; DELETE só admin (`is_org_admin()`). Sem recursão.

**Triggers**:
- Em `pre_budgets` AFTER INSERT/UPDATE: criar `dashboard_alerts.pre_budget_pending` quando `created_from='voice_axia'` e `status in ('draft','pending_review')`; resolver quando passa a `ready_to_convert` ou `converted_to_budget`.
- Em `relatorios_diarios` AFTER INSERT/UPDATE: análogo para `rdo_pending`.
- Em `contas_financeiras` AFTER INSERT/UPDATE: `financial_missing_project` quando `obra_id is null` e `created_from='voice_axia'`.
- Em `axia_intake_items` AFTER INSERT/UPDATE: `axia_needs_review` quando `status='needs_more_info'`; resolver quando vai para `approved`/`converted`/`rejected`.

**Storage**: bucket privado `voice-intake` para áudio (path `{user_id}/{voice_command_id}.webm`), com policies idênticas ao padrão `plan-files` (memory `storage-policy-plan-files-standard`).

---

### 2. Edge Function `process-voice-command`

`supabase/functions/process-voice-command/index.ts`

Fluxo:
1. Receber `{ voice_command_id }`, validar JWT, carregar comando.
2. Carregar contexto: organização do utilizador (`get_user_org_id`), 10 obras recentes do org, `categorias_financeiras` do user, top 50 termos de `artigos_trabalho`, data atual `pt-PT`.
3. **Pré-classificação determinística** (regex/keywords): detetar valores monetários (`/\d+\s*(€|eur|euros)/i`), verbos de execução, palavras-chave de pré-orçamento, "falta/precisa/encomendar". Resolver `obra_id` via fuzzy match contra nome da obra (Levenshtein simples, threshold 0.7).
4. **Chamada à Lovable AI Gateway** (`google/gemini-3-flash-preview`) com tool calling para JSON estruturado (schema: `intent`, `confidence`, `requires_human_review`, `project_resolution`, `items[]`, `explanation`). Zero invenção: apenas dados do contexto. Tratar 429/402.
5. **Pós-processamento + persistência** (transação lógica):
   - Para cada `item` retornado, criar `axia_intake_items` (sempre).
   - Aplicar matriz de confiança:
     - `≥0.90` → criar rascunho na entidade final + alerta.
     - `0.70–0.89` → criar rascunho + `pending_review`.
     - `0.50–0.69` → só `axia_intake_items`.
     - `<0.50` → `unknown` + `needs_more_info`.
   - Regras finais:
     - `financial_record` sem obra → `contas_financeiras` com `intake_status='missing_project'` e `obra_id=null`.
     - `rdo` sem obra → **não** criar `relatorios_diarios`; apenas intake `needs_more_info` + alerta.
     - `pre_budget` → sempre `pending_review` (nunca cria `orcamentos`).
     - Se intake já existe na mesma data para mesma obra (RDO), faz append a `daily_report_activities` em vez de criar novo.
6. Atualizar `voice_commands.processing_status='processed'`, gravar `axia_result`, devolver `{ status, created_items[], alerts_created }`.
7. Em qualquer erro: `processing_status='failed'`, gravar `error_message`, log em `axia_processing_logs`.

`config.toml`: `verify_jwt = true` (precisa do user para RLS, contexto da org).

---

### 3. Frontend — componentes e páginas

**Componentes novos** (`src/components/axia/voice/`):
- `VoiceCommandButton.tsx` — botão "Comando Axia" com ícone microfone, abre modal. Props: `obraId?`, `sourceContext`.
- `VoiceCommandModal.tsx` — modal com: gravação via `MediaRecorder` (fallback para textarea), upload do áudio para `voice-intake`, transcrição via Edge Function (Web Speech API ou OpenAI Whisper via gateway — usa `pt-PT`), preview, envio, estados (`a ouvir`, `a transcrever`, `a processar`, `concluído`, `precisa revisão`, `erro`), botão "Rever agora" → `/axia/inbox`.
- `AxiaIntakeCard.tsx` — card por item (badge tipo, título, resumo, obra, confiança, missing fields, perguntas, ações).
- `DashboardAlertsWidget.tsx` — bloco "Pendências Axia" no Dashboard com lista paginada de alertas abertos, agrupados por tipo, com botão de ação que navega para a entidade.

**Páginas**:
- `src/pages/axia/Inbox.tsx` em `/axia/inbox` com Tabs (Todos, Pré-orçamentos, RDOs, Financeiro, Sem obra, Baixa confiança). Realtime via Supabase channel em `axia_intake_items`.
- `src/pages/pre-orcamentos/Ver.tsx` em `/pre-orcamentos/:id` — editor de pré-orçamento com botão "Converter em orçamento" que cria registo em `orcamentos` e marca `pre_budgets.status='converted_to_budget'`.

**Integração com páginas existentes**:
- `src/pages/Dashboard.tsx` — adicionar `<DashboardAlertsWidget />` no topo e `<VoiceCommandButton sourceContext="global" />` no header.
- `src/pages/obras/Ver.tsx` — adicionar `<VoiceCommandButton obraId={obra.id} sourceContext="project" />`.
- Sidebar — entrada "Caixa Axia" no grupo "Visão Geral" com badge de pendências.

**Fluxo de aprovação** (em `Inbox.tsx`):
- `pre_budget` → abre `/pre-orcamentos/:id`.
- `rdo` → abre `/rdos/criar` ou `/rdos/:id` (já existente) pré-preenchido.
- `financial_record` → abre modal de associação (obra, categoria, comprovativo) e marca `intake_status='confirmed'`.
- `unknown` → editor manual com seletor de destino.

---

### 4. Hooks e serviços (`src/hooks/`)

- `useVoiceIntake.ts` — `createCommand`, `processCommand`, `useVoiceCommand(id)`.
- `useAxiaInbox.ts` — `useIntakeItems(filters)`, `approve`, `reject`, `convert`, `markNeedsMoreInfo` (com toasts).
- `useDashboardAlerts.ts` — `useOpenAlerts`, `dismiss`, `resolve`, contagem por tipo (para badge).

Nota: a especificação pede `src/services/*.ts`, mas o projeto convencionou hooks React Query (`src/hooks/`) — manter consistência.

---

### 5. AI / Lovable AI Gateway

- Modelo padrão: **`google/gemini-3-flash-preview`** (rápido, custo baixo, suficiente para classificação + extração).
- Estrutura via **tool calling** (não pedir JSON em texto livre) com schema rígido `axia_intake_v1`.
- Prompt versionado (`prompt_version='axia.intake.v1'`) gravado em `axia_processing_logs`.
- Usa `LOVABLE_API_KEY` já provisionado.
- Erros 429/402 → toast claro no frontend + `processing_status='failed'`.

Transcrição de áudio: começar com **Web Speech API** (browser, gratuito, `pt-PT`) e textarea fallback. Whisper fica como evolução futura para mobile/PWA.

---

### 6. Critérios de aceitação cobertos

Todos os 18 critérios da spec ficam cobertos. Pontos-chave:
- Voz **nunca** cria `orcamentos` nem finaliza `relatorios_diarios`.
- RDO sem obra → só intake + alerta.
- Financeiro sem obra → `contas_financeiras` com `intake_status='missing_project'` + alerta.
- Multi-empresa: tudo via `get_org_member_ids()` (já validado em prod).
- Auditoria: `voice_commands` (transcrição + áudio) + `axia_processing_logs` (modelo, prompt, latência).

---

### 7. Ordem de execução

1. Migration: novas tabelas + colunas em `relatorios_diarios`/`contas_financeiras`/`daily_report_activities` + bucket `voice-intake` + triggers de alertas + policies RLS.
2. Edge function `process-voice-command` + `config.toml` se necessário.
3. Hooks (`useVoiceIntake`, `useAxiaInbox`, `useDashboardAlerts`).
4. `VoiceCommandModal` + `VoiceCommandButton`.
5. `DashboardAlertsWidget` + integração no `Dashboard.tsx`.
6. `AxiaInbox` em `/axia/inbox` + entrada na sidebar.
7. `/pre-orcamentos/:id` + fluxo "Converter em orçamento".
8. Integração `VoiceCommandButton` em `obras/Ver.tsx`.
9. Polimento UX (linguagem profissional Axia, badges, estados visuais — segue memory `axia-core-system-standard` e `premium-visual-identity`).

---

### Observações para confirmação

- **Confirma:** podemos seguir o padrão `organizations`/`get_org_member_ids()` do projeto em vez de criar `companies`/`user_company_memberships` paralelas? (recomendado — caso contrário criamos um schema duplicado que não conversa com o resto da plataforma).
- **Confirma:** transcrição inicial via Web Speech API do navegador (gratuita, pt-PT) com textarea fallback, deixando Whisper para fase 2?
- **Confirma:** modelo Lovable AI `google/gemini-3-flash-preview` como default (~baixo custo, latência ~1-2s)?
