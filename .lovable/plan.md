

# Redesign Completo do Onboarding — Obra Sys

## Visão Geral

Substituir o onboarding atual (modal welcome + cards checklist separados) por uma experiência em 2 fases: **Wizard guiado full-screen** na primeira sessão + **Painel de progresso compacto único** no dashboard.

---

## 1. Migração de Base de Dados

Adicionar colunas à tabela `user_onboarding_progress`:

```sql
ALTER TABLE user_onboarding_progress
  ADD COLUMN IF NOT EXISTS wizard_status text DEFAULT 'not_started',    -- not_started | in_progress | completed | skipped
  ADD COLUMN IF NOT EXISTS wizard_current_step integer DEFAULT 0,       -- 0-4
  ADD COLUMN IF NOT EXISTS selected_goal text,                          -- organizar_obra | criar_orcamento | acompanhar_execucao | centralizar_equipa
  ADD COLUMN IF NOT EXISTS selected_role text;                          -- diretor | gestor_obra | orcamentista | tecnico_fiscal | outro
```

A função `sync_onboarding_progress` mantém-se (verifica dados reais), mas o wizard tem estado próprio.

---

## 2. Novos Componentes

### Wizard (Fase 1)
- **`OnboardingWizard.tsx`** — Container principal com stepper visual (4 dots/passos), controla navegação entre steps, persiste estado no DB a cada transição. Layout centralizado, max-w-2xl, fundo branco com sombra premium.
- **`OnboardingStepWelcome.tsx`** — Passo 1: headline "Organize a sua primeira obra em minutos", CTAs "Começar" / "Explorar primeiro"
- **`OnboardingStepGoal.tsx`** — Passo 2: 4 tiles selecionáveis com ícone + microcopy de benefício
- **`OnboardingStepRole.tsx`** — Passo 3: 5 opções de perfil como botões radio visuais
- **`OnboardingStepCreateProject.tsx`** — Passo 4: formulário mínimo inline (nome, cliente, localização + opcionais tipo/data início). Usa `useObras().createObra` diretamente. Após sucesso mostra estado de confirmação com CTAs "Ir para o dashboard" / "Criar orçamento agora"

### Checklist Dashboard (Fase 2)
- **`OnboardingProgressPanel.tsx`** — Container único com título orientado a resultado, barra de progresso com pesos (40/25/15/20%), até 3 próximos passos visíveis, reordenação dinâmica baseada no `selected_goal`, botão minimizar/fechar. Quando ativação mínima atingida (obra + 1 ação), transforma-se em estado de sucesso.
- **`OnboardingChecklistItem.tsx`** — Item individual: ícone, título, microcopy de benefício, badge de estado (pendente/concluído), CTA de ação

### Mantidos (sem alteração)
- `OnboardingCompletionModal.tsx` — reutilizado no estado de conclusão total

### Removidos
- `OnboardingWelcomeModal.tsx` — substituído pelo Step 1 do wizard
- `OnboardingChecklist.tsx` — substituído pelo ProgressPanel
- `OnboardingInactiveReminder.tsx` — integrado no ProgressPanel

---

## 3. Hook `useOnboarding` — Reescrita

Novo estado exposto:
```ts
{
  progress,                    // dados DB completos
  loading,
  wizardStatus,               // not_started | in_progress | completed | skipped
  showWizard,                 // wizard_status !== completed && !== skipped
  showProgressPanel,          // wizard done/skipped && !dismissed && !minActivation
  showSuccessState,           // ativação mínima atingida (obra + 1 outro)
  percentage,                 // com pesos 40/25/15/20
  orderedSteps,               // reordenados por selected_goal
  // actions
  updateWizardStep,           // persiste step atual + dados
  completeWizard,
  skipWizard,
  dismissPanel,
  refreshProgress,
}
```

Percentagem com pesos: obra=40%, orçamento=25%, equipa=15%, RDO=20%.

Reordenação: se `selected_goal === 'criar_orcamento'`, orçamento sobe para posição 1 (após obra se já criada).

---

## 4. Dashboard.tsx — Integração

- Remover imports de `OnboardingWelcomeModal`, `OnboardingChecklist`, `OnboardingInactiveReminder`
- Se `showWizard`: renderizar `<OnboardingWizard />` como overlay/secção principal acima do conteúdo do dashboard (não bloqueia navegação sidebar)
- Se `showProgressPanel`: renderizar `<OnboardingProgressPanel />` como primeiro bloco no dashboard
- Se `showSuccessState`: renderizar estado de sucesso no ProgressPanel
- Manter engagement banners e KPIs abaixo

---

## 5. Design Visual

- Wizard: container branco centralizado, `rounded-2xl shadow-xl border`, stepper com circles numerados + linha conectora, azul `#00679d` como cor de destaque
- Progress Panel: card único `border-primary/20`, gradient subtil, barra de progresso azul, items com hover suave
- Tipografia Red Hat Display nos headlines
- Ícones Lucide consistentes: Building2, FileText, Users, ClipboardList
- Mobile responsive: wizard usa `max-w-lg` no mobile, tiles empilham verticalmente

---

## Ficheiros Afetados

| Ação | Ficheiro |
|------|---------|
| Criar | `src/components/onboarding/OnboardingWizard.tsx` |
| Criar | `src/components/onboarding/OnboardingStepWelcome.tsx` |
| Criar | `src/components/onboarding/OnboardingStepGoal.tsx` |
| Criar | `src/components/onboarding/OnboardingStepRole.tsx` |
| Criar | `src/components/onboarding/OnboardingStepCreateProject.tsx` |
| Criar | `src/components/onboarding/OnboardingProgressPanel.tsx` |
| Criar | `src/components/onboarding/OnboardingChecklistItem.tsx` |
| Reescrever | `src/hooks/useOnboarding.ts` |
| Editar | `src/pages/Dashboard.tsx` |
| Editar | `src/components/onboarding/index.ts` |
| Remover | `src/components/onboarding/OnboardingWelcomeModal.tsx` |
| Remover | `src/components/onboarding/OnboardingChecklist.tsx` |
| Remover | `src/components/onboarding/OnboardingInactiveReminder.tsx` |
| Migração DB | Adicionar colunas wizard_status, wizard_current_step, selected_goal, selected_role |

