

## Corrigir Recursao Infinita nas Politicas de Seguranca da Tabela "Obras"

### Problema
Os seus dados estao seguros, mas o sistema nao consegue mostra-los devido a um erro de configuracao nas regras de seguranca da base de dados. Existe uma referencia circular entre duas tabelas:

1. A tabela **obras** tem uma regra que consulta a tabela **client_obra_access**
2. A tabela **client_obra_access** tem uma regra que consulta a tabela **obras**

Isto cria um ciclo infinito que bloqueia todas as consultas a tabela de obras, impedindo o carregamento de orcamentos, obras, relatorios e outros modulos.

### Solucao

Criar uma funcao auxiliar segura que verifica se o utilizador e dono de uma obra sem passar pelas regras de seguranca (evitando o ciclo). Depois, atualizar a politica da tabela `client_obra_access` para usar essa funcao.

### Detalhes Tecnicos

**1. Criar funcao `is_obra_owner`** (SECURITY DEFINER - bypassa RLS):

```sql
CREATE OR REPLACE FUNCTION public.is_obra_owner(_obra_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obras
    WHERE id = _obra_id AND user_id = auth.uid()
  );
$$;
```

**2. Substituir a politica problematica em `client_obra_access`**:

- Eliminar: "Obra owners can manage client access" (que faz SELECT em `obras` causando o ciclo)
- Criar nova politica usando a funcao `is_obra_owner()` em vez de consulta direta

**Ficheiros alterados**: Apenas migracoes SQL na base de dados. Nenhum ficheiro de codigo precisa ser modificado.

**Resultado**: Todas as consultas a tabela `obras` voltarao a funcionar imediatamente, restaurando o acesso a orcamentos, obras, relatorios e demais modulos.

