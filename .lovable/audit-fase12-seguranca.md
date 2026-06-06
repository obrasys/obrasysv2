# Fase 12 — Auditoria final de compatibilidade e segurança

Auditoria das alterações introduzidas pelas Fases 1–11 do módulo Planta/ICF (PDF + DXF). Objetivo: confirmar que nada na entrega:

1. Quebra fluxos antigos,
2. Expõe dados entre organizações,
3. Cria endpoints sem JWT/IDOR,
4. Promove conteúdo para orçamento sem clique humano explícito.

---

## 1. Compatibilidade — migrações e schema

**Resultado: ✅ sem regressões.**

| Tabela / artefacto                | Estado                              | Notas |
|-----------------------------------|-------------------------------------|-------|
| `plan_imports`                    | Inalterada                          | `file_type` é `TEXT` sem CHECK — aceitar `'dxf'` não exigiu migração (Fase 3). |
| `plan_analysis_versions`          | Reutilizada (existia)               | Fase 7 grava `analysis_payload`, `summary`, `human_reviewed`, `requires_review`, `confidence`, `notes` — todas colunas pré-existentes. |
| `plan_analysis_logs`              | Reutilizada (existia)               | Fase 4, 7, 8, 9 inserem eventos novos (`analise_iniciada`, `analise_concluida_com_revisao`, `revisao_humana_guardada`, `orcamento_criado`, `orcamento_atualizado`) — todos válidos pelo `event_type TEXT` sem CHECK. `status` respeita o CHECK (`info/success/warning/error`). |
| `orcamentos / capitulos_orcamento / artigos_orcamento` | Reutilizadas (Fase 8) | Inserções aditivas com `source='axia_icf_planta'` e `linked_element_id=version_id`. Sem alterar registos existentes. |
| `icf_panos_parede / icf_fundacoes / icf_lajes / icf_vaos / icf_wall_panels` | Inalteradas | Fase 8 mantém o caminho legacy ("Carregar para configuração ICF") intacto. |

**Migrações novas nesta entrega: zero.** Toda a evolução foi feita reaproveitando colunas existentes — análises antigas continuam legíveis e o pipeline anterior do PDF não foi removido.

---

## 2. RLS e GRANTs nas tabelas tocadas

Verificado via `\d` no Postgres em runtime:

### `public.plan_analysis_versions`
- **RLS:** habilitada.
- **Políticas:**
  - SELECT/INSERT/UPDATE — `organization_id = get_user_org_id()` (+ `created_by = auth.uid()` no INSERT).
  - DELETE — apenas `created_by = auth.uid()`.
- **GRANTs:** corretos para `authenticated` e `service_role` (verificado via política PostgREST — sem isso o frontend não conseguia escrever; comprovado em Fase 7).
- **`get_user_org_id()`:** `SECURITY DEFINER` com `search_path = public` — não recursivo, padrão do projeto.

### `public.plan_analysis_logs`
- **RLS:** habilitada.
- **Políticas:** SELECT/INSERT só para membros da mesma organização (`organization_id = get_user_org_id()`).
- **GRANTs:** idênticos ao acima.

### `public.plan_imports`
- **RLS pré-existente.** Continuou inalterada na Fase 3 — apenas o frontend e o storage upload mudaram.

> Nenhuma das tabelas novas/reutilizadas tem política para `anon` — todas exigem `auth.uid()`. Não há fuga cross-tenant possível através de PostgREST.

---

## 3. Edge functions — autenticação e anti-IDOR

Auditadas duas funções tocadas/criadas:

### `supabase/functions/icf-plant-analysis/index.ts` (existente, mantida)
- ✅ Lê `Authorization: Bearer` e valida via `anonClient.auth.getUser(token)`.
- ✅ Resolve `organization_id` do utilizador via `organization_members`.
- ✅ Anti-IDOR (Lote 2.2 + Fase 12): lê `plan_imports` pelo `file_path`, vai buscar `organization_id` do importador e compara com o do utilizador autenticado — bloqueia 403 se não bater.
- ✅ Logs em `plan_analysis_logs` sempre scoped por `organization_id` autenticada (nunca pela do request).

### `supabase/functions/plan-dxf-parse/index.ts` (novo, Fase 4)
- ✅ Mesmo padrão de autenticação (`getUser(token)`).
- ✅ Mesmo cruzamento `plan_imports → organization_members → organization_id` — bloqueia 403 quando o `file_path` não pertence à organização do chamador.
- ✅ Logs auditáveis em `plan_analysis_logs` com `organization_id` validado server-side.
- ✅ Validação mínima de input: `file_path` e `configuracao_id` obrigatórios; `unit_override` restringido a `mm|cm|m|in|dm` no parser.
- ⚠️ **Sem rate limit dedicado** — herdamos o limite global da plataforma. Parser DXF é determinístico (sem custos de IA), pelo que o risco operacional é baixo; abuso de upload seria limitado a 20 MB por ficheiro.

### Storage `plan-files`
- Já regido pelo standard `[Storage Policy](mem://security/storage-policy-plan-files-standard)` — bucket privado, paths prefixados por `user.id`, leitura por URL assinada apenas. Nada mudou nesta entrega.

---

## 4. Política "nada vai para orçamento sem humano"

Caminho de promoção validado ponto-a-ponto:

1. **Upload (Fase 3)** — só faz `plan_imports.insert`. Não invoca pipeline.
2. **Análise (Fase 4)** — escreve em `plan_analysis_versions` com `requires_review=true` por defeito (DXF) ou conforme audit (PDF). Nunca cria artigos de orçamento.
3. **Confirmação de escala (Fase 5)** — exige clique humano no `DxfUnitConfirmDialog`; cancelar descarta o resultado.
4. **Revisão (Fase 7)** — `useIcfQuantitiesReview` só corre via clique em "Guardar revisão". Mantém `requires_review=true` se ainda houver paredes amarelas.
5. **Gate de confiança (Fase 9)** — `evaluateConfidenceGate()` bloqueia os botões "Carregar para configuração ICF" e "Enviar para orçamento" quando há razões críticas (`isBlocked=true`).
6. **Promoção (Fase 8)** — `IcfPlanToBudgetDialog` exige seleção explícita do modo ("Criar novo" / "Adicionar a existente") e confirmação. Sem clique humano, zero linhas em `orcamentos / artigos_orcamento`.

---

## 5. Linter Supabase

187 findings reportados — **todos pré-existentes** ao módulo Planta/ICF:

- ~4 × `Public Bucket Allows Listing` — buckets antigos (não `plan-files`).
- Múltiplos `Public Can Execute SECURITY DEFINER Function` — funções legacy fora deste módulo. As funções usadas pela entrega (`get_user_org_id`, `has_role`, `is_super_admin`) já estão dentro do padrão do projeto e marcadas como SECURITY DEFINER com `search_path = public`, conforme [memória do padrão RLS](mem://security/rls-recursion-protection-pattern).
- Restantes: tabelas/funções de outros módulos (financeiro, orçamentos, supplier portal).

**Nenhum finding novo foi introduzido pelas Fases 1–11.**

---

## 6. Itens fora de âmbito (recomendações futuras)

- Rate-limit dedicado por organização no `plan-dxf-parse` (ex.: 30 análises/h) caso o parser DXF passe a chamar Gemini para layers ambíguos.
- Migrar `plan_budget_links` para suportar quantitativos agregados (atualmente `measurement_id NOT NULL`) — abre rastreabilidade fina por parede em vez de por versão.
- Adicionar `event_type` enum em `plan_analysis_logs` para impedir typos a longo prazo (hoje aceita qualquer TEXT).

---

## Conclusão

A entrega das Fases 1–11 é **aditiva, isolada por organização e bloqueada por humano** em todos os pontos de promoção para orçamento. Não há fuga de dados entre tenants, não há novos endpoints públicos, e todas as escritas server-side passam por `getUser()` + cruzamento explícito com `organization_members`. Pronta para a **Fase 13 (critérios de aceitação)**.
