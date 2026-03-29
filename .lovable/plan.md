

# Auditoria Geral do Sistema ObraSys

## Resumo da Auditoria

Analisei rotas, componentes, hooks, edge functions, logs de consola e ligações entre módulos. Seguem os problemas identificados organizados por severidade.

---

## ERROS ATIVOS (Severidade Alta)

### 1. Warning React: forwardRef em ConformidadeIndex
- **Problema**: `Dialog` e `AlertDialog` do Radix estão a receber refs em componentes funcionais sem `forwardRef`, gerando warnings na consola.
- **Ficheiro**: `src/pages/conformidade/Index.tsx`
- **Correção**: Garantir que os componentes `Dialog` e `AlertDialog` estejam a ser usados com estado controlado (`open`/`onOpenChange`) em vez de refs.

### 2. CORS incompleto em `process-daily-report`
- **Problema**: Os headers CORS estão incompletos (`'authorization, x-client-info, apikey, content-type'`), faltam os headers de plataforma/runtime usados pelo cliente Supabase.
- **Ficheiro**: `supabase/functions/process-daily-report/index.ts`
- **Correção**: Atualizar para incluir `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`.

### 3. `create-client-portal-access` tenta mudar role de utilizadores existentes
- **Problema**: Quando um utilizador existente (ex: gestor) é convidado, o `user_metadata` passa `role: 'cliente'` na criação. Para utilizadores existentes, isto não é aplicado, mas para novos utilizadores criados com `created_by`, o trigger `handle_new_user` pode atribuir o role errado.
- **Ficheiro**: `supabase/functions/create-client-portal-access/index.ts` (linha 135)
- **Correção**: Não passar `role: 'cliente'` no `user_metadata` para evitar conflitos. Usar apenas `client_obra_access` para controlo de acesso ao portal.

---

## CÓDIGO ÓRFÃO (Severidade Média)

### 4. Hook `useFiscalReports` nunca importado
- **Ficheiro**: `src/hooks/useFiscalReports.ts` (159 linhas)
- **Status**: Exporta `useFiscalReports()` mas nenhum componente o importa.
- **Ação**: Remover ou ligar a uma página de relatórios fiscais.

### 5. Hook `useOrcamentoEssencial` nunca importado
- **Ficheiro**: `src/hooks/useOrcamentoEssencial.ts` (306 linhas)
- **Status**: Exporta `useOrcamentoEssencial()` mas nenhum componente o importa. A página `Essencial.tsx` provavelmente usa uma versão v2 diferente.
- **Ação**: Verificar se é código legado e remover.

---

## INCONSISTÊNCIAS (Severidade Média)

### 6. `process-daily-report` usa `esm.sh` em vez de `npm:`
- **Problema**: `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'` enquanto outras funções usam `npm:@supabase/supabase-js@2`. Isto pode causar incompatibilidades de versão.
- **Ficheiro**: `supabase/functions/process-daily-report/index.ts`
- **Correção**: Normalizar para `npm:@supabase/supabase-js@2`.

### 7. `ManagerRoute` não bloqueia role `supplier`
- **Problema**: O `ManagerRoute` só redireciona `cliente` para `/portal`. Um utilizador com role `supplier` pode aceder a todas as rotas de gestor.
- **Ficheiro**: `src/components/portal/ManagerRoute.tsx`
- **Correção**: Adicionar verificação para `supplier` e redirecionar para `/fornecedor/dashboard`.

### 8. `useClientAccess` query desativada para role `cliente`
- **Problema**: O hook tem `enabled: !!user?.id && profile?.role !== 'cliente'` mas retorna `false` por default quando desativado, o que é inconsistente pois clientes deveriam ter `hasClientAccess = true`.
- **Ficheiro**: `src/hooks/useClientAccess.ts`
- **Correção**: Retornar `true` diretamente quando `profile?.role === 'cliente'`, sem depender do `useQuery`.

---

## MELHORIAS DE ROBUSTEZ (Severidade Baixa)

### 9. Sidebar já mostra "Portal do Cliente" corretamente
- O link condicional foi implementado corretamente na última alteração.

### 10. Falta rota `/admin/migracao` no menu de navegação
- **Problema**: A rota existe em `App.tsx` mas não aparece em `ADMIN_NAV_ITEMS` no `navigation.ts`.
- **Correção**: Adicionar item de navegação ou remover a rota se não for mais necessária.

---

## Plano de Correções

| # | Correção | Ficheiro(s) |
|---|---------|-------------|
| 1 | Corrigir ref warnings no Conformidade | `src/pages/conformidade/Index.tsx` |
| 2 | Atualizar CORS do process-daily-report | `supabase/functions/process-daily-report/index.ts` |
| 3 | Remover `role: 'cliente'` do metadata na criação de portal | `supabase/functions/create-client-portal-access/index.ts` |
| 4 | Remover hook órfão `useFiscalReports` | `src/hooks/useFiscalReports.ts` |
| 5 | Remover hook órfão `useOrcamentoEssencial` | `src/hooks/useOrcamentoEssencial.ts` |
| 6 | Normalizar import esm.sh → npm: | `supabase/functions/process-daily-report/index.ts` |
| 7 | Bloquear suppliers no ManagerRoute | `src/components/portal/ManagerRoute.tsx` |
| 8 | Corrigir default de useClientAccess para clientes | `src/hooks/useClientAccess.ts` |
| 9 | Adicionar Migração ao menu admin (ou remover rota) | `src/config/navigation.ts` |

