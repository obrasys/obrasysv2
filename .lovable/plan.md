
# Sistema de Onboarding Guiado - Obra Sys

## Resumo
Criar um sistema de onboarding completo com modal de boas-vindas no primeiro login, checklist fixa no dashboard com 4 passos, barra de progresso, detecao automatica de conclusao via base de dados, e mensagem de parabens ao completar tudo.

---

## 1. Base de Dados

### Nova tabela: `user_onboarding_progress`

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid (PK) | gen_random_uuid() |
| user_id | uuid (UNIQUE, NOT NULL) | - |
| first_login_done | boolean | false |
| step_1_completed | boolean | false (Criar obra) |
| step_2_completed | boolean | false (Criar orcamento) |
| step_3_completed | boolean | false (Adicionar colaborador) |
| step_4_completed | boolean | false (Criar RDO) |
| onboarding_dismissed | boolean | false |
| completed_at | timestamptz | null |
| created_at | timestamptz | now() |

### RLS
- SELECT/UPDATE/INSERT: `user_id = auth.uid()`

### Funcao de sincronizacao
Funcao `sync_onboarding_progress(p_user_id)` que verifica automaticamente nas tabelas `obras`, `orcamentos`, `equipa_membros` e `rdos` se o utilizador ja completou cada passo, atualizando os campos booleanos e definindo `completed_at` quando todos estiverem concluidos.

---

## 2. Componentes UI (6 ficheiros novos)

### `src/hooks/useOnboarding.ts`
- Busca e sincroniza o progresso do onboarding
- Calcula percentagem (0%, 25%, 50%, 75%, 100%)
- Expoe funcoes: `dismissWelcome`, `refreshProgress`, `dismissOnboarding`
- Deteta primeiro login (registo sem `first_login_done = true`)

### `src/components/onboarding/OnboardingWelcomeModal.tsx`
- Modal exibido apenas quando `first_login_done = false`
- Titulo: "Bem-vindo ao Obra Sys"
- Texto motivacional conforme especificado
- Botao "Comecar agora" (marca first_login_done e mostra checklist)
- Botao "Prefiro explorar sozinho" (marca first_login_done e dismiss)

### `src/components/onboarding/OnboardingChecklist.tsx`
- Card fixo no dashboard (abaixo do welcome message, antes dos KPIs)
- Titulo: "Primeiros Passos para Dominar a Sua Obra"
- 4 passos com icones, texto descritivo e microcopy
- Cada passo mostra check verde quando concluido ou botao de acao
- Barra de progresso percentual no topo do card
- Pode ser minimizado/dispensado pelo utilizador

### `src/components/onboarding/OnboardingCompletionModal.tsx`
- Modal exibido quando todos os 4 passos estao concluidos
- Titulo: "Parabens. Ja esta a gerir como um profissional."
- Botoes: "Ver Relatorio da Obra" e "Explorar Funcionalidades Avancadas"

### `src/components/onboarding/OnboardingInactiveReminder.tsx`
- Notificacao discreta para utilizadores que nao criaram obra nas primeiras 24h
- Titulo: "Ainda nao criou a sua primeira obra?"
- Botao: "Agendar Ajuda Rapida" (redireciona para /suporte)

### `src/components/onboarding/index.ts`
- Barrel exports

---

## 3. Integracao no Dashboard

Alteracoes em `src/pages/Dashboard.tsx`:
- Importar e usar `useOnboarding`
- Mostrar `OnboardingWelcomeModal` no primeiro login
- Mostrar `OnboardingChecklist` quando onboarding nao esta completo nem dispensado
- Mostrar `OnboardingCompletionModal` quando passa de 75% para 100%
- Mostrar `OnboardingInactiveReminder` quando aplicavel
- Nao alterar o layout principal existente -- checklist aparece como card adicional

---

## 4. Regras de Negocio

- Modal de boas-vindas: apenas 1 vez (primeiro login)
- Checklist: visivel ate completar ou dispensar
- Maximo 1 mensagem/modal por sessao (reutilizar padrao do engagement)
- Progresso sincronizado automaticamente ao entrar no dashboard
- Nao conflita com o sistema de engagement existente (estados A/B/C/D)

---

## Detalhes Tecnicos

### SQL da migracao

```sql
CREATE TABLE public.user_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  first_login_done boolean DEFAULT false,
  step_1_completed boolean DEFAULT false,
  step_2_completed boolean DEFAULT false,
  step_3_completed boolean DEFAULT false,
  step_4_completed boolean DEFAULT false,
  onboarding_dismissed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding"
ON public.user_onboarding_progress FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_onboarding_progress(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_s1 boolean; v_s2 boolean; v_s3 boolean; v_s4 boolean;
  v_all boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM obras WHERE user_id = p_user_id) INTO v_s1;
  SELECT EXISTS(SELECT 1 FROM orcamentos WHERE user_id = p_user_id) INTO v_s2;
  SELECT EXISTS(SELECT 1 FROM equipa_membros WHERE user_id = p_user_id) INTO v_s3;
  SELECT EXISTS(SELECT 1 FROM rdos WHERE user_id = p_user_id) INTO v_s4;
  v_all := v_s1 AND v_s2 AND v_s3 AND v_s4;

  INSERT INTO user_onboarding_progress (user_id, step_1_completed, step_2_completed, step_3_completed, step_4_completed, completed_at)
  VALUES (p_user_id, v_s1, v_s2, v_s3, v_s4, CASE WHEN v_all THEN now() ELSE null END)
  ON CONFLICT (user_id) DO UPDATE SET
    step_1_completed = v_s1,
    step_2_completed = v_s2,
    step_3_completed = v_s3,
    step_4_completed = v_s4,
    completed_at = CASE WHEN v_all AND user_onboarding_progress.completed_at IS NULL THEN now() ELSE user_onboarding_progress.completed_at END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

### Ficheiros criados/alterados
- **Criar**: `src/hooks/useOnboarding.ts`
- **Criar**: `src/components/onboarding/OnboardingWelcomeModal.tsx`
- **Criar**: `src/components/onboarding/OnboardingChecklist.tsx`
- **Criar**: `src/components/onboarding/OnboardingCompletionModal.tsx`
- **Criar**: `src/components/onboarding/OnboardingInactiveReminder.tsx`
- **Criar**: `src/components/onboarding/index.ts`
- **Editar**: `src/pages/Dashboard.tsx` (adicionar componentes de onboarding)
