

## Correção: Email de Convite Não Enviado

### Problema

A Edge Function `create-client-portal-access` só envia email quando cria um utilizador novo (linha 182: `if (resendApiKey && isNewUser && tempPassword)`). Se o cliente já tem conta no sistema, o email de convite nunca é enviado.

Adicionalmente, a resposta da API do Resend não é verificada, pelo que erros de envio são silenciados.

### Solução

Alterar a lógica de envio para cobrir dois cenários:

1. **Utilizador novo**: Enviar email com credenciais (email + senha temporária)
2. **Utilizador existente**: Enviar email a informar que tem acesso a uma nova obra (sem senha)

E adicionar logging da resposta do Resend para diagnóstico.

### Alterações Técnicas

**Ficheiro**: `supabase/functions/create-client-portal-access/index.ts`

1. Mover o bloco de envio de email para fora da condição `isNewUser` (linha 182)
2. Criar dois templates de email:
   - Novo utilizador: inclui email + senha temporária
   - Utilizador existente: inclui apenas link de acesso e nome da obra
3. Capturar e registar a resposta da API do Resend (status + body) para diagnóstico
4. Usar o template fallback adequado para cada cenário

### Resultado Esperado

- Convites enviados tanto para utilizadores novos como existentes
- Erros do Resend visíveis nos logs para diagnóstico futuro
