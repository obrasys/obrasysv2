

# Plano: Gestão de Equipa Completa no Perfil

## Resumo

Criar um sistema completo de gestão de equipa dentro da secao Perfil, permitindo ao administrador convidar colaboradores para a sua conta organizacional existente, definir permissoes por modulo, controlar acesso a obras, e gerir membros/convites -- tudo sem nunca criar uma nova conta de empresa para o convidado.

## Estrutura Existente

O projeto ja tem:
- Tabelas `organizations` e `organization_members` (com role)
- Edge Function `admin-user-actions` que cria utilizadores e os associa a organizacao do convidador
- `AddUserDialog` basico (nome, email, role)
- Tab "Equipa" no Perfil (atualmente vazia, so empty state)
- `useFeatureGate` para controlo de plano

## Plano de Implementacao

### 1. Migracao de Base de Dados

Criar 4 novas tabelas com RLS:

**`team_invitations`** -- convites pendentes
- `id`, `organization_id`, `email`, `full_name`, `phone`, `job_title`, `internal_note`, `role_code`, `obra_scope` (all/assigned/none), `invited_by_user_id`, `status` (pending/accepted/expired/revoked), `expires_at`, `accepted_at`, `accepted_by_user_id`, `created_at`

**`team_invitation_module_permissions`** -- permissoes por modulo no convite
- `id`, `invitation_id` (FK), `module_code`, `can_view`, `can_create`, `can_update`, `can_delete`

**`member_module_permissions`** -- permissoes por modulo do membro ativo
- `id`, `member_id` (FK organization_members), `module_code`, `can_view`, `can_create`, `can_update`, `can_delete`

**`member_project_access`** -- acesso a obras especificas
- `id`, `member_id` (FK organization_members), `obra_id` (FK obras), `access_level` (full/read)

Adicionar colunas a `organization_members`:
- `member_status` (active/suspended/invited) default 'active'
- `job_title`
- `invited_by`
- `last_seen_at`
- `obra_scope` (all/assigned/none)

RLS: todas as tabelas com politicas baseadas em `get_org_member_ids()` para leitura; escrita restrita a admin/owner da org.

### 2. Componentes de UI (10+ novos ficheiros)

Criar pasta `src/components/team/`:

- **`TeamManagementSection.tsx`** -- Container principal com 3 tabs (Membros, Convites, Perfis de Acesso)
- **`MembersTable.tsx`** -- Tabela de membros com filtros (nome, role, estado, modulo), badges de estado, acoes
- **`InvitationsTable.tsx`** -- Tabela de convites pendentes com filtros e acoes (reenviar, revogar)
- **`AccessProfilesPanel.tsx`** -- Presets de permissoes (Admin, Gestor de Obra, Tecnico, Financeiro, Leitor) com edicao
- **`AddCollaboratorModal.tsx`** -- Modal/Drawer com 4 passos:
  1. Dados do colaborador (nome, email, telemovel, cargo, nota)
  2. Role base (admin, manager, technician, finance, viewer)
  3. Permissoes por modulo (13 modulos x 4 acoes + scope)
  4. Acesso a obras (todas / especificas / nenhuma)
- **`EditPermissionsModal.tsx`** -- Editar permissoes de membro existente
- **`ModulePermissionsGrid.tsx`** -- Componente reutilizavel com checkboxes por modulo/acao
- **`ObraSelector.tsx`** -- Lista pesquisavel de obras para selecao multipla
- **`MemberStatusBadge.tsx`** -- Badge visual para estados (active, suspended, invited, revoked)
- **`ConfirmActionDialog.tsx`** -- Dialogo de confirmacao para suspender/remover/revogar

### 3. Hook de Dados

**`src/hooks/useTeamManagement.ts`**:
- Query membros da organizacao (join profiles + module_permissions + project_access)
- Query convites pendentes
- Mutations: criar convite, reenviar, revogar, suspender membro, reativar, remover, editar permissoes
- Dados mock iniciais para demo enquanto backend nao esta ligado

### 4. Integracao no Perfil

Substituir o empty state atual da tab "Equipa" em `Perfil.tsx` pelo novo `TeamManagementSection`. Manter o gate de plano (trial/starter mostra upgrade prompt).

### 5. Edge Function Update

Atualizar `admin-user-actions` para:
- Aceitar `modulePermissions` e `obraScope` no payload de `create_user`
- Criar registos em `team_invitations`, `team_invitation_module_permissions`
- Ao aceitar convite, copiar permissoes para `member_module_permissions` e `member_project_access`

### 6. Presets de Permissoes

Definir no frontend (`src/config/accessProfiles.ts`) os 5 presets com permissoes padrao por modulo, usados como ponto de partida no step 2 do modal.

## Modulos do Sistema (13)

Orcamentos, Obras, Cronograma, RDO, Medicoes, Progresso, Documentos, Clientes, Fornecedores, Dashboards, Equipa, Configuracoes, Axia

## Microcopy Obrigatoria

- Titulo: "Gestao de Equipa"
- Descricao: "Adicione colaboradores a sua conta para gerir obras em conjunto."
- No modal: "Este colaborador sera adicionado a sua conta da empresa. Nao sera criada uma nova conta de empresa."

## Ficheiros a Criar/Editar

| Ficheiro | Acao |
|---|---|
| `supabase/migrations/...` | Criar tabelas + RLS |
| `src/components/team/TeamManagementSection.tsx` | Criar |
| `src/components/team/MembersTable.tsx` | Criar |
| `src/components/team/InvitationsTable.tsx` | Criar |
| `src/components/team/AccessProfilesPanel.tsx` | Criar |
| `src/components/team/AddCollaboratorModal.tsx` | Criar |
| `src/components/team/EditPermissionsModal.tsx` | Criar |
| `src/components/team/ModulePermissionsGrid.tsx` | Criar |
| `src/components/team/ObraSelector.tsx` | Criar |
| `src/components/team/MemberStatusBadge.tsx` | Criar |
| `src/components/team/ConfirmActionDialog.tsx` | Criar |
| `src/components/team/index.ts` | Criar |
| `src/config/accessProfiles.ts` | Criar |
| `src/hooks/useTeamManagement.ts` | Criar |
| `src/types/team.ts` | Criar |
| `src/pages/Perfil.tsx` | Editar (substituir tab Equipa) |
| `supabase/functions/admin-user-actions/index.ts` | Editar |

## Notas de Seguranca

- RLS em todas as tabelas novas baseada em org membership
- Impedir convite duplicado para mesmo email na mesma org
- Impedir remover ultimo owner
- Validar modulos contra plano ativo via `planLimits`
- Nao permitir roles viewer/technician/finance gerir equipa
- Trigger para impedir auto-remocao do owner

