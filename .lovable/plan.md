
# Sistema de Rastreamento de Logins

## Objetivo
Registar cada login de utilizador numa tabela dedicada para medir com precisao a frequencia de acesso a plataforma.

## 1. Base de Dados

### Nova tabela: `auth_activity_logs`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador unico |
| user_id | uuid (NOT NULL) | Utilizador que fez login |
| event_type | text | Tipo de evento (login, signup, password_reset) |
| ip_address | text | Endereco IP (opcional, extraido do metadata) |
| user_agent | text | Browser/dispositivo |
| created_at | timestamptz | Data/hora do evento |

### RLS
- SELECT: `user_id = auth.uid()` (cada utilizador ve os seus) + super admins veem tudo
- INSERT: `user_id = auth.uid()` (so pode inserir para si proprio)

### Indice
- `idx_auth_activity_user_created` em `(user_id, created_at DESC)` para consultas rapidas de contagem

## 2. Alteracao no AuthContext

No `signIn()`, apos login bem-sucedido, inserir um registo na tabela `auth_activity_logs` com `event_type = 'login'`.

No listener `onAuthStateChange`, quando `event === 'SIGNED_IN'`, registar tambem (cobre logins por token refresh e OAuth).

Sera usado um mecanismo de deduplicacao simples: so registar no `onAuthStateChange` se nao foi um `signIn()` explicito (para evitar duplicados).

## 3. Consulta para Metricas

Com esta tabela, sera possivel responder diretamente:
- Quantos logins por utilizador
- Utilizadores que voltaram 3+ vezes
- Frequencia de acesso por periodo

---

## Detalhes Tecnicos

### SQL da migracao
```sql
CREATE TABLE public.auth_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'login',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_auth_activity_user_created 
ON public.auth_activity_logs (user_id, created_at DESC);

ALTER TABLE public.auth_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
ON public.auth_activity_logs FOR SELECT
USING (user_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "Users can insert own activity"
ON public.auth_activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());
```

### Codigo no AuthContext
- No `signIn`: apos sucesso, chamar `supabase.from('auth_activity_logs').insert({ user_id, event_type: 'login', user_agent: navigator.userAgent })`
- Fire-and-forget (sem bloquear o login)

### Ficheiros alterados
- `src/contexts/AuthContext.tsx` - adicionar registo de login
- `src/integrations/supabase/types.ts` - atualizado automaticamente
