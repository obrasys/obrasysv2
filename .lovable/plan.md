
# Hardening de Segurança — Versão Enxuta

Sem refatorar hooks nem inventar rotas de servidor. Foco em fechar buracos reais de RLS e ganhar rasto auditável das operações sensíveis.

---

## Fase 1 — Auditoria RLS (read-only, gera relatório)

Correr no Supabase e compilar um relatório markdown com:

1. **Tabelas `public.*` sem RLS ativo** (`rowsecurity = false`).
2. **Tabelas com RLS mas sem qualquer policy** (efetivamente fechadas — verificar se intencional).
3. **Policies permissivas demais**: `USING (true)`, `WITH CHECK (true)`, ou que ignoram `auth.uid()` / `get_org_member_ids()`.
4. **Grants a `anon`** em tabelas que deviam ser só `authenticated`.
5. **Colunas sensíveis expostas**: `nif`, `salario_base`, `telefone`, `email`, `iban`, `password_*`, tokens — listar onde aparecem e se há view restritiva.
6. **Views sem `security_invoker=on`** (bypassam RLS do utilizador).
7. **Funções `SECURITY DEFINER` sem `set search_path`** (vetor conhecido).

Correr também `supabase--linter` para apanhar avisos automáticos.

**Output:** relatório em `.lovable/security-audit.md` com cada achado classificado como `BLOQUEANTE` / `MÉDIO` / `INFORMATIVO` + SQL de correção sugerido para cada um.

**Nada é corrigido nesta fase** — só diagnóstico. Tu revês e aprovas os fixes antes da Fase 2.

---

## Fase 2 — Correções RLS aprovadas

Para cada achado `BLOQUEANTE` / `MÉDIO` que aprovares, migration única consolidada:

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` onde estiver em falta.
- `REVOKE` em grants indevidos a `anon`.
- Policies novas/ajustadas usando os helpers existentes (`get_org_member_ids()`, `has_role()`, `is_super_admin()`).
- Views `security_invoker=on` para colunas sensíveis quando aplicável.
- `set search_path = public` em funções `SECURITY DEFINER` que faltem.

Tudo numa migration revisível antes de aplicar.

---

## Fase 3 — Tabela de auditoria + triggers

### 3.1 Schema

```sql
CREATE TABLE public.audit_log (
  id            bigserial PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid,                          -- auth.uid()
  actor_email   text,
  organization_id uuid,
  table_name    text NOT NULL,
  record_id     text,                          -- PK do registo afetado (texto p/ flexibilidade)
  action        text NOT NULL,                 -- INSERT | UPDATE | DELETE
  old_data      jsonb,
  new_data      jsonb,
  diff          jsonb,                         -- só campos alterados (UPDATE)
  ip_address    inet,                          -- via request.headers se disponível
  user_agent    text
);

CREATE INDEX ON public.audit_log (occurred_at DESC);
CREATE INDEX ON public.audit_log (organization_id, occurred_at DESC);
CREATE INDEX ON public.audit_log (table_name, record_id);
CREATE INDEX ON public.audit_log (actor_id, occurred_at DESC);
```

**Grants & RLS:**
- `GRANT SELECT ON public.audit_log TO authenticated;`
- `GRANT ALL ON public.audit_log TO service_role;`
- RLS: SELECT apenas para `is_super_admin(auth.uid())` ou membros da mesma `organization_id`.
- **Sem INSERT/UPDATE/DELETE policies** — só triggers `SECURITY DEFINER` escrevem. Frontend nunca toca aqui.

### 3.2 Função de trigger genérica

`public.log_audit_event()` — `SECURITY DEFINER`, `set search_path = public`:
- Captura `TG_OP`, `TG_TABLE_NAME`, `OLD`, `NEW`.
- Resolve `organization_id` da própria linha (fallback `NULL`).
- Resolve `actor_email` via `auth.users` se `auth.uid()` existir.
- Em UPDATE, calcula `diff` (só chaves cujo valor mudou).
- Insere na `audit_log`.

### 3.3 Tabelas auditadas (escopo cirúrgico — não tudo)

| Tabela | Ações | Porquê |
|---|---|---|
| `obras` | I/U/D | Operacional crítico |
| `orcamentos` | I/U/D | Financeiro / contratual |
| `orcamento_itens` | U/D | Alterações pós-adjudicação |
| `equipa_membros` | I/U/D | Recursos humanos |
| `user_roles` | I/U/D | **Privilege escalation** |
| `team_invitations` | I/U/D | Acesso à org |
| `super_admins` | I/U/D | Acesso máximo |
| `clientes` | I/U/D | PII |
| `subempreiteiros` | I/U/D | PII + financeiro |
| `livro_ponto` | I/U/D | Custos laborais |
| `financeiro_*` (receitas, despesas, cycles) | I/U/D | Dinheiro |
| `adjudicacoes` | I/U/D | Compromisso contratual |
| `client_portal_access` | I/U/D | Acessos externos |
| `supplier_portal_access` | I/U/D | Acessos externos |

Triggers `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW EXECUTE FUNCTION log_audit_event()`.

### 3.4 UI mínima (Super Admin)

Página `/admin/auditoria` (lazy-loaded, só visível a super admins):
- Filtros: data, ator, tabela, ação, organização.
- Lista paginada com timeline + diff expansível (UPDATEs).
- Export CSV (UTF-8 BOM, `;` — padrão PT do projeto).

Standard de listagem do projeto: card grid + bottom toolbar.

---

## O que NÃO está incluído (e porquê)

- **Não refatorar os ~100 hooks `supabase.from(...)`** — quebraria realtime, signed URLs, cache e tipos. A proteção real é o RLS, não esconder o cliente.
- **Não criar “rotas /api”** — projeto é Vite SPA. Onde é preciso `service_role`, já existem Edge Functions.
- **Não auditar todas as tabelas** — listing acima cobre os vetores reais (dinheiro, acesso, PII). Auditar tudo enche a tabela de ruído.

---

## Detalhes técnicos

- Migration única por fase (Fase 2 RLS, Fase 3 audit) para rollback limpo.
- `log_audit_event()` swallow-on-error com `RAISE WARNING` — auditoria nunca pode partir um INSERT/UPDATE legítimo.
- `audit_log` cresce: prever job de purga (manter 24 meses) numa fase 4 futura, fora deste plano.
- IP/user-agent: tentar via `current_setting('request.headers', true)::jsonb` — se ausente, ficam `NULL` (browser direto vs Edge Function).

---

## Ordem de execução após aprovares

1. Fase 1 → relatório `.lovable/security-audit.md`.
2. Tu revês, aprovas/rejeitas cada achado.
3. Fase 2 → migration RLS.
4. Fase 3.1–3.3 → migration audit table + triggers.
5. Fase 3.4 → página `/admin/auditoria`.
