

## Fix: Erro ao Convidar Cliente no Portal

### Problema Identificado

Existem dois problemas na Edge Function `create-client-portal-access`:

1. **Parametros nao tratados**: O componente `ObraPortalClienteTab` envia `client_email` e `client_name` no body do pedido, mas a Edge Function so le `orcamento_id` e `obra_id`. Quando so o `obra_id` e fornecido (sem `orcamento_id`), o `clienteEmail` fica `null`, causando falha.

2. **CORS incompletos**: Faltam headers do Supabase client (`x-supabase-client-platform`, etc.), o que pode causar falhas no preflight.

### Solucao

Atualizar a Edge Function para:
- Ler `client_email` e `client_name` do body do pedido
- Usar esses valores quando fornecidos (cenario de convite manual)
- Manter o fluxo existente via `orcamento_id` para o cenario de adjudicacao
- Corrigir os CORS headers

### Alteracoes Tecnicas

**Ficheiro**: `supabase/functions/create-client-portal-access/index.ts`

1. Atualizar `corsHeaders` para incluir todos os headers necessarios do Supabase client
2. Ao ler o body JSON, tambem extrair `client_email` e `client_name`
3. Quando `obra_id` e fornecido com `client_email` (convite manual), usar esses valores diretamente em vez de tentar obter do orcamento
4. Validar que existe email antes de prosseguir

