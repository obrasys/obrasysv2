

## Sistema Multi-Utilizador por Empresa (Organizações)

### Problema Atual
Todos os dados (obras, orçamentos, RDOs, clientes, tarefas, etc.) estão isolados por `user_id`. Quando um utilizador convida um colega, o novo utilizador entra numa conta vazia sem acesso aos dados da empresa. Não existe conceito de "equipa" ou "organização".

### Solução: Introduzir `organization_id`

Criar uma tabela `organizations` que agrupa utilizadores da mesma empresa. Todos os dados passam a ser filtrados por `organization_id` em vez de `user_id`, permitindo que todos os membros da equipa vejam e trabalhem nos mesmos dados.

```text
┌─────────────────┐
│  organizations  │
│  ─────────────  │
│  id (uuid)      │
│  nome           │
│  nif            │
│  owner_id (fk)  │
└────────┬────────┘
         │ 1:N
┌────────┴────────┐
│ organization_   │
│ members         │
│ ─────────────   │
│ user_id (fk)    │
│ organization_id │
│ role (enum)     │
└─────────────────┘
```

### Alterações na Base de Dados

1. **Nova tabela `organizations`** com id, nome, nif, logo, owner_id
2. **Nova tabela `organization_members`** com user_id, organization_id, role (admin/gestor/fiscal/financeiro/sales)
3. **Adicionar coluna `organization_id`** a todas as tabelas de dados: obras, orcamentos, clientes, relatorios_diarios, tarefas, cronogramas, equipa_membros, subempreiteiros, equipamentos, contas_financeiras, autos_medicao, base_precos_personalizada, artigos_trabalho, etc.
4. **Migração de dados existentes**: Para cada utilizador existente, criar automaticamente uma organização e associar os seus dados
5. **Atualizar RLS policies**: Mudar de `user_id = auth.uid()` para `organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())`
6. **Função helper `get_user_org_id()`**: Security definer que retorna o organization_id do utilizador atual

### Alterações no Frontend

1. **AuthContext**: Incluir `organization_id` no profile/contexto
2. **13+ hooks** (useObras, useOrcamentos, useRDOs, useClientes, useTarefas, useRecursos, useFinanceiro, useBasePrecos, useCadernos, useAutosMedicao, useConformidade, useObraAlerts, useParametricEngine): Substituir `.eq('user_id', user.id)` por `.eq('organization_id', orgId)` nas queries e inserts
3. **Edge Function `admin-user-actions`**: Ao criar utilizador, associá-lo à organização de quem convidou (via `created_by` metadata)
4. **Página de Perfil/Equipa**: Mostrar membros da organização e permitir gestão

### Fluxo do Convite (Corrigido)

1. Admin/Gestor convida novo utilizador com email e role
2. Edge function cria o utilizador, cria o profile, e adiciona-o à mesma `organization_id` do convidador
3. Novo utilizador define password via email
4. Ao entrar, vê todos os dados da organização (obras, orçamentos, etc.) de acordo com a sua role

### Faseamento

Dada a dimensão desta alteração (afeta toda a base de dados e 13+ ficheiros de código), proponho implementar em **2 fases**:

**Fase 1 - Base de dados e migração**
- Criar tabelas organizations e organization_members
- Adicionar organization_id às tabelas existentes
- Migrar dados existentes
- Atualizar RLS policies
- Atualizar edge function de convite

**Fase 2 - Frontend**
- Atualizar AuthContext com org_id
- Atualizar todos os hooks para usar organization_id
- UI de gestão de equipa

### Ficheiros Afetados
- 1 migração SQL (tabelas + dados + RLS)
- `supabase/functions/admin-user-actions/index.ts`
- `src/contexts/AuthContext.tsx`
- 13+ hooks em `src/hooks/`
- `src/components/admin/AddUserDialog.tsx`
- Página de perfil/equipa

