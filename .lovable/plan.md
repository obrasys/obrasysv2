## Objetivo

Restringir a leitura de **NIF** e **dados salariais** apenas a admins/owners da organização. Restantes campos (nome, email, telefone, morada) continuam visíveis a todos os membros, preservando a colaboração atual.

## Abordagem

Em vez de mexer no RLS coluna-a-coluna (não suportado nativamente em RLS) ou refactorizar todo o frontend, vamos:

1. **Criar função** `public.is_org_admin_or_self(_target_user_id uuid)` — `SECURITY DEFINER`, devolve `true` se o utilizador atual é admin/owner da organização **ou** se é o próprio dono da linha.

2. **Adicionar trigger `BEFORE SELECT`** — não existe em Postgres. Em vez disso, aplicar **máscara via VIEWS** que substituem as tabelas no acesso normal e devolvem `NULL` nos campos sensíveis quando o utilizador não é admin/owner.

3. **Plano final escolhido (mínimo impacto):** manter tabelas tal como estão, mas adicionar **colunas geradas via VIEW** + atualizar apenas os hooks que mostram os campos sensíveis na UI.

## Mudanças concretas

### Base de dados (1 migração)

- Criar `public.is_org_admin_or_self(uuid)` (SECURITY DEFINER, STABLE).
- Criar 4 views com colunas mascaradas:
  - `clientes_view` → `nif` mascarado.
  - `equipa_membros_view` → `nif`, `salario_*` mascarados.
  - `profiles_view` → `nif`, `empresa_nif` mascarados.
  - `workers_view` → `nif`, `monthly_salary`, `hourly_rate`, `default_*_cost`, `unit_rate_*`, `overtime_*` mascarados.
- Cada view usa `WITH (security_invoker = on)` para herdar RLS da tabela base.
- `GRANT SELECT` das views a `authenticated`.

### Frontend (hooks de listagem)

- `useClientes`, `useTeamManagement`, `useRecursos`, `useLivroPonto` (listagens) → apontar para as views em vez das tabelas.
- Escritas (insert/update) continuam a ir para as tabelas base — não muda nada.
- Páginas de **edição** (`clientes/Editar`, `recursos/VerMembro`, `livro-ponto/Trabalhadores`) continuam a ler da tabela base; RLS atual já restringe ao próprio ou org. Adicionalmente, na UI, esconder NIF/salário se utilizador não for admin (via `useSuperAdmin`/`is_org_admin`).

### Detalhes técnicos

- Função de verificação:
  ```sql
  CREATE FUNCTION public.is_org_admin_or_self(_target uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
    SELECT _target = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om1
          JOIN organization_members om2 ON om2.organization_id = om1.organization_id
          WHERE om1.user_id = auth.uid()
            AND om1.role IN ('admin','owner')
            AND om2.user_id = _target
        );
  $$;
  ```
- Padrão de máscara em view:
  ```sql
  CREATE VIEW public.clientes_view WITH (security_invoker = on) AS
  SELECT c.id, c.user_id, c.nome, c.email, c.telefone, c.telemovel,
         c.empresa, c.endereco, c.codigo_postal, c.cidade, c.pais,
         c.nivel_acesso, c.ativo, c.observacoes, c.created_at, c.updated_at,
         CASE WHEN public.is_org_admin_or_self(c.user_id) THEN c.nif ELSE NULL END AS nif
  FROM public.clientes c;
  ```

### Findings cobertos

- ✅ `clientes_pii_org_readable`
- ✅ `equipa_membros_nif_salary_org_readable`
- ✅ `profiles_org_member_pii_exposure`
- ✅ `workers_table_missing_org_isolation_nif`

## Não incluído

- Não vão ser mexidas funcionalidades existentes nem o fluxo de gestão de equipa.
- Não são alteradas políticas RLS das tabelas base (continuam a permitir leitura para a app funcionar; o que muda é que os hooks de listagem passam a usar views mascaradas).
- O `useSuperAdmin` / verificação `is_org_admin` é só refinamento de UI — opcional nesta fase.

Confirma para avançar?