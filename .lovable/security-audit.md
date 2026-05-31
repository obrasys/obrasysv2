# Auditoria de Segurança — Obra Sys (Fase 1)

**Data:** 2026-05-31
**Escopo:** Schema `public.*` + buckets de storage + funções `SECURITY DEFINER`
**Método:** queries diretas a `pg_class` / `pg_policy` / `pg_proc` / `information_schema` + `supabase--linter`

---

## TL;DR

O projeto tem uma postura de segurança **acima da média**:

- **0 tabelas** sem RLS ativo (todas as ~150 tabelas `public.*` têm `rowsecurity = true`)
- **0 grants a `anon`** em qualquer tabela `public.*` (a anon key não consegue ler nada diretamente)
- **0 funções `SECURITY DEFINER` sem `search_path` definido** (vetor clássico fechado)
- **0 views sem `security_invoker=on`**

Os achados abaixo são **hardening** — não buracos críticos. O print que o programador externo enviou (`GET equipa_membros?select=*` → 200 OK) é comportamento **normal e seguro** do Supabase: o JWT do utilizador foi validado e o RLS devolveu apenas a organização dele.

---

## Achados

### A1 — `USING (true)` em tabelas-catálogo `[INFORMATIVO]`

8 policies de leitura com `USING (true)`, todas em tabelas-catálogo partilhadas e só para `authenticated`:

| Tabela | Natureza |
|---|---|
| `axia_budget_stats` | Estatísticas agregadas Axia |
| `axia_item_dictionary` | Dicionário global de itens |
| `matriz_capitulos_padrao` | Capítulos-tipo de orçamento |
| `orcamento_templates_essencial` | Templates Essencial |
| `specialty_symbol_library` | Símbolos técnicos (plantas) |
| `supplier_categories` | Categorias de fornecedores |
| `supplier_category_link` | Link categorias↔fornecedores |
| `axia_call_logs` (INSERT) | Logs do service_role |

**Veredicto:** intencional. São dicionários partilhados, sem PII. **Sem ação.**

---

### A2 — Funções `SECURITY DEFINER` executáveis por `anon` `[MÉDIO]`

`pg_proc` mostra ~60 funções `SECURITY DEFINER` no schema `public`. O default do PostgreSQL é `GRANT EXECUTE ... TO PUBLIC`, por isso quase todas têm `EXECUTE` para `anon`. O linter Supabase emitiu **161 warnings** neste tema (regra `0028`).

Categorias reais:

**(a) Trigger functions** — anon executar é inofensivo (só `BEFORE/AFTER` em DML autenticado), mas higiénico revogar:
`handle_updated_at`, `handle_new_user`, `handle_new_supplier`, `handle_obra_create_cost_center`, `mce_recalc_aggregates`, `mce_assign_number`, `invalidate_measurements_on_recalibration`, `create_subscriber_for_new_user`, `icf_sync_pano_vaos`, `log_budget_event`, `generate_orcamento_codigo`, `get_next_auto_number` (quando usados em triggers), etc.

**(b) Funções de negócio chamáveis via RPC** — devem ficar **só `authenticated`**:
`aplicar_matriz_capitulos`, `apply_mce_to_budget_objetivo`, `approve_base_dry_budget`, `award_mce`, `confirm_award`, `create_budget_revision`, `create_contracting_package`, `create_mce_default_approvals`, `create_new_target_version`, `decide_mce_approval`, `execute_parametric_rule`, `execute_parametric_rule_v2`, `generate_final_closing_sheet`, `generate_icf_budget_transactional`, `generate_project_snapshot`, `generate_task_snapshots`, `handle_*_alert`, `mark_user_as_migrated`, `buscar_historico_match`, `calculate_element_parameters`, `calculate_obra_progress`, `can_access_rdo_photo`, `classify_task_delay`, `cleanup_expired_mfa_data`, `determinar_regime_fiscal`, `get_price_stats`.

**(c) Helpers de RLS** — chamados pelas próprias policies; geralmente devem ser executáveis por `authenticated` (e tecnicamente também `anon` para policies em fluxos pré-login, mas no nosso caso só por `authenticated`):
`get_org_member_ids`, `get_user_org_id`, `is_obra_owner`, `is_org_admin`, `is_org_admin_or_self`, `is_quote_request_owner`, `is_quote_request_supplier`, `is_super_admin`, `is_supplier`, `is_trusted_device`, `has_role`.

**(d) Já corretas** (anon revogado):
`admin_get_all_supplier_profiles`, `get_my_supplier_profile`, `get_public_supplier_profiles` — boa prática que já está aplicada nessas três.

**Risco real:** Baixo a médio. Mesmo que um atacante chame uma RPC com anon key, a função internamente usa `auth.uid()` e RLS, então normalmente recusa. Mas há funções (`confirm_award`, `award_mce`, `decide_mce_approval`, `execute_parametric_rule*`) que assumem utilizador autenticado e podem ter comportamento inesperado quando `auth.uid()` é `NULL`. Recomendado revogar.

**Ação proposta (Fase 2):** Migration única que faz `REVOKE EXECUTE ... FROM PUBLIC, anon` em todas as funções acima e `GRANT EXECUTE ... TO authenticated` onde for chamada via RPC. As trigger-only podem ficar só com `service_role`.

---

### A3 — Buckets públicos com listagem `[INFORMATIVO]`

4 buckets `public = true`:

| Bucket | Uso | Veredicto |
|---|---|---|
| `avatars` | Fotos de perfil embutidas em `<img>` | Intencional |
| `brand-assets` | Branding white-label | Intencional |
| `empresa-logos` | Logo da empresa em PDFs/portais | Intencional |
| `recursos` | Fotos de equipa/equipamento/subempreiteiros | Intencional |

O warning é que a policy SELECT permite **listar** todos os ficheiros (não só ler quando se sabe o caminho). Para conteúdo público-por-design, é aceitável; só vale a pena fechar se os nomes de ficheiros revelarem algo sensível (não é o caso — são UUIDs).

**Sem ação obrigatória.** Opcional: restringir listing ao próprio user via prefixo `auth.uid()/`.

---

### A4 — Print do programador externo `[NÃO É UM ACHADO]`

`GET https://...supabase.co/rest/v1/equipa_membros?select=*` → 200 OK, 947 B.

Decomposto:
- A request enviou um JWT válido (Authorization a verde no Postman dele).
- RLS na `equipa_membros`: `SELECT/UPDATE/DELETE USING (user_id = ANY (get_org_member_ids()))`, `INSERT WITH CHECK (user_id = auth.uid())`, todas restritas a `authenticated`.
- Retornou apenas os membros da organização dele — exatamente o que o RLS permite.

**Isto é como o Supabase é suposto funcionar.** A "exposição" do REST é o próprio design do PostgREST, protegido pelo RLS por-utilizador. Refatorar para esconder o cliente por trás de rotas de servidor **diminuiria** a segurança (passaria tudo a `service_role` e perderia o filtro por JWT).

---

## Plano para Fase 2

Migration única consolidada:

1. `REVOKE EXECUTE ON FUNCTION public.<f> FROM PUBLIC, anon;` para todas as funções `SECURITY DEFINER` listadas em A2.
2. `GRANT EXECUTE ON FUNCTION public.<f> TO authenticated;` para funções RPC (categoria b + c).
3. Funções puramente de trigger (categoria a) ficam só com `postgres` e `service_role` (default após revoke).

Sem alterações de RLS — todas as políticas estão corretas.
Sem alterações em buckets — públicos por design.

**Estimativa:** 1 migration de ~60 linhas.

---

## Plano para Fase 3 (auditoria operacional)

Sem dependência da Fase 2 — pode correr em paralelo se quiseres.

Criar `public.audit_log` + função genérica `log_audit_event()` + triggers nas tabelas críticas (obras, orcamentos, user_roles, super_admins, team_invitations, clientes, subempreiteiros, livro_ponto, financeiro_*, adjudicacoes, client_portal_access, supplier_portal_access).

UI mínima em `/admin/auditoria` para Super Admin.
