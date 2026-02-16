

## Corrigir Redirecionamento ao Sair

### Problema

Ao clicar em "Sair", a aplicacao navega para `/auth`, mas como o estado `user` so e limpo de forma assincrona (pelo listener `onAuthStateChange`), a pagina Auth.tsx ainda ve o utilizador como autenticado e redireciona de volta para `/dashboard`.

### Correcao

**Ficheiro `src/contexts/AuthContext.tsx`** - Na funcao `signOut`, limpar imediatamente os estados `user` e `session` antes de chamar `supabase.auth.signOut()`:

```typescript
const signOut = async () => {
  setUser(null);
  setSession(null);
  setProfile(null);
  await supabase.auth.signOut();
};
```

Isto garante que quando o `navigate('/auth')` executa logo a seguir (no TopBar), o estado `user` ja esta `null` e a pagina Auth.tsx nao redireciona de volta para o dashboard.

### Ficheiros alterados
- `src/contexts/AuthContext.tsx` (1 alteracao na funcao signOut)

