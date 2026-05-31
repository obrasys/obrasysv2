# Correção: Race Condition + Rollback de Convites

Apenas 2 patches focados, baixo risco.

## Patch 1 — AuthContext: aguardar perfil antes de libertar loading

**Ficheiro:** `src/contexts/AuthContext.tsx` (linhas 155–165)

Tornar o callback de `getSession()` async e aguardar `fetchProfile()` antes de `setLoading(false)`, com try/finally para garantir que o loading liberta mesmo em erro.

```ts
supabase.auth.getSession().then(async ({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
  
  try {
    if (session?.user) {
      profileUserId = session.user.id;
      await fetchProfile(session.user.id);
    }
  } finally {
    setLoading(false);
  }
});
```

**Efeito:** Cliente/Fornecedor deixam de ver flash do `/dashboard` antes de serem redirecionados para `/portal` ou `/fornecedor/dashboard`.

---

## Patch 2 — useTeamManagement: rollback de convites órfãos

**Ficheiro:** `src/hooks/useTeamManagement.ts` (linhas 142–199)

Envolver os passos 2 (permissões) e 3 (edge function) num try/catch que faz `DELETE` do convite + permissões se algo falhar — liberta o índice único do email para re-convites futuros.

```ts
mutationFn: async (formData) => {
  // 1. INSERT convite (mantém-se igual)
  const { data: invite, error: invError } = await supabase
    .from('team_invitations')
    .insert({ ... })
    .select()
    .single();
  if (invError) throw invError;

  try {
    // 2. Permissões
    if (formData.module_permissions.length > 0) {
      const { error: permErr } = await supabase
        .from('team_invitation_module_permissions')
        .insert(permRows);
      if (permErr) throw permErr;
    }

    // 3. Edge function
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'admin-user-actions', { body: { ... } }
    );
    if (fnError) throw fnError;

    return invite;
  } catch (err) {
    // ROLLBACK — libertar email para re-convite
    await supabase.from('team_invitation_module_permissions')
      .delete().eq('invitation_id', invite.id);
    await supabase.from('team_invitations')
      .delete().eq('id', invite.id);
    throw err;
  }
}
```

**Efeito:** Falhas transitórias no `admin-user-actions` deixam de bloquear permanentemente o email pelo unique index.

---

## Verificação

1. Login como cliente → deve ir direto a `/portal` sem flash do `/dashboard`.
2. Tentar convidar email com edge function temporariamente quebrada → toast de erro, e re-convite com o mesmo email deve funcionar (não dispara "duplicate").

## Nota
Vi no código que `mfaVerified` **usa sim** `sessionStorage` (linhas 69–78 do AuthContext) — o relatório nesse ponto estava correto. Não está no scope destes 2 patches; fica como recomendação futura para hardening server-side.
