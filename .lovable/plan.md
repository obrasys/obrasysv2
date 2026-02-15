

## Correção do Portal do Cliente - Isolamento de Acesso

### Problemas Identificados

1. **Redirecionamento errado no login**: O `Auth.tsx` redireciona todos os utilizadores para `/dashboard`, incluindo clientes
2. **Rotas sem proteção de role**: Clientes podem navegar manualmente para `/dashboard`, `/obras`, `/orcamentos`, `/financeiro`, etc.
3. **RLS não concede acesso a clientes**: A tabela `obras` usa `user_id = auth.uid()`, mas o cliente nao e o dono da obra -- o portal nao consegue carregar dados
4. **Faltam politicas RLS dedicadas**: Tabelas `obras`, `relatorios_diarios` e `obra_progress_tracking` nao tem politicas SELECT para clientes via `client_obra_access`

### Plano de Correcao

#### 1. Politicas RLS para acesso de clientes (base de dados)

Criar politicas SELECT (apenas leitura) nas 3 tabelas que o portal precisa, usando a tabela `client_obra_access` como ponte:

- **`obras`**: Clientes podem VER obras onde tenham acesso ativo
- **`relatorios_diarios`**: Clientes podem VER RDOs submetidos/aprovados das obras com acesso
- **`obra_progress_tracking`**: Clientes podem VER progresso das obras com acesso

Todas as politicas verificam: `EXISTS (SELECT 1 FROM client_obra_access WHERE client_user_id = auth.uid() AND obra_id = [tabela].obra_id AND ativo = true)`

Nenhuma politica de INSERT, UPDATE ou DELETE sera criada para clientes.

#### 2. Redirecionar clientes no login (`Auth.tsx`)

Apos login, verificar o role do perfil:
- Se `role === 'cliente'` -> redirecionar para `/portal`
- Caso contrario -> redirecionar para `/dashboard`

#### 3. Proteger rotas de gestor

Criar componente `ManagerRoute` (ou reutilizar logica) que bloqueia acesso a utilizadores com `role === 'cliente'`:
- Aplica-se a TODAS as rotas de gestao: `/dashboard`, `/obras`, `/orcamentos`, `/rdos`, `/financeiro`, `/clientes`, `/tarefas`, `/conformidade`, `/recursos`, `/relatorios`, `/base-precos`, `/cadernos`, `/autos-medicao`, `/perfil`, `/definicoes`, `/planos`, `/subscricao`, `/pesquisa`, `/suporte`
- Clientes que tentem aceder sao redirecionados para `/portal`

#### 4. Limpar queries do portal (`useClientPortal.ts`)

Remover casts `as any` e garantir que as queries so pedem colunas estritamente necessarias (sem campos sensiveis como `valor_previsto`).

### Secao Tecnica

**Migracao SQL:**
```sql
-- Clientes podem ver obras onde tem acesso ativo
CREATE POLICY "Clients can view assigned obras"
ON public.obras FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_obra_access
    WHERE client_user_id = auth.uid()
      AND obra_id = obras.id
      AND ativo = true
  )
);

-- Clientes podem ver RDOs submetidos/aprovados
CREATE POLICY "Clients can view RDOs of assigned obras"
ON public.relatorios_diarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_obra_access
    WHERE client_user_id = auth.uid()
      AND obra_id = relatorios_diarios.obra_id
      AND ativo = true
  )
  AND status IN ('submetido', 'aprovado')
);

-- Clientes podem ver progresso
CREATE POLICY "Clients can view progress of assigned obras"
ON public.obra_progress_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_obra_access
    WHERE client_user_id = auth.uid()
      AND obra_id = obra_progress_tracking.obra_id
      AND ativo = true
  )
);
```

**Ficheiros a alterar:**
- `src/pages/Auth.tsx` -- redirecionar clientes para `/portal`
- `src/App.tsx` -- envolver rotas de gestao com `ManagerRoute`
- `src/components/portal/ManagerRoute.tsx` -- novo componente (bloqueia clientes)
- `src/hooks/useClientPortal.ts` -- limitar campos retornados, remover `as any`

**Resultado:** Clientes ficam estritamente confinados ao Portal (`/portal/*`) com acesso apenas de leitura a dados aprovados das suas obras.
