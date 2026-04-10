

# Gamificação e Onboarding Assistido no Dashboard

## Resumo

Melhorar a experiência de utilizadores novos (estado vazio) e veteranos com: estados vazios motivacionais nos KPIs, insights inteligentes no bloco de alertas quando vazio, cores mais vibrantes nos cards de KPI, e uma barra de conclusão de perfil/configuração.

## Alterações

### 1. `src/components/dashboard/DashboardKPIStrip.tsx` — Estados Vazios Ativos + Cores Vibrantes

- Quando um KPI tem valor zero, o subtitle muda para uma mensagem de incentivo contextual:
  - Obras Ativas = 0: "Crie a sua primeira obra para começar"
  - Obras em Risco = 0: "Excelente! Nenhuma obra em risco"  (com ícone verde)
  - Receber Esta Semana = 0: "Sem cobranças esta semana"
  - Medições Pendentes = 0: "Tudo validado. Bom trabalho!"
- Melhorar contraste de cores nos ícones:
  - Obras Ativas: fundo `bg-blue-100` / ícone `text-blue-600` (mais vibrante que primary/10)
  - Obras em Risco com valor > 0: fundo `bg-red-100` / ícone `text-red-600` (mais saturado)
  - Receber: manter `bg-emerald-100` / `text-emerald-600`
  - Medições: manter `bg-amber-100` / `text-amber-600`

### 2. `src/components/dashboard/DashboardPriorities.tsx` — Insights no Estado Vazio de Alertas

- Quando `alerts` está vazio (sem alertas reais), em vez de mostrar "Sem alertas no momento", mostrar um bloco de Insights/Dicas rotativas:
  - Lista de 4-5 dicas estáticas (ex: "Obras com RDOs diários têm 30% menos atrasos", "Orçamentos detalhados reduzem desvios em até 25%", etc.)
  - Selecionar uma aleatoriamente (baseada no dia) com ícone `Lightbulb`
  - Visual diferenciado: fundo suave azul/primary em vez do cinza de alerta
- Quando `priorities` está vazio, manter a mensagem positiva mas adicionar um CTA contextual

### 3. `src/components/dashboard/DashboardSetupProgress.tsx` — Nova Barra de Conclusão (widget temporário)

- Novo componente que calcula percentagem de configuração baseado em campos do perfil e dados existentes:
  - Tem logo da empresa? (+20%)
  - Tem morada da empresa? (+15%)
  - Criou primeira obra? (+25%)
  - Criou primeiro orçamento? (+20%)
  - Criou primeiro RDO? (+10%)
  - Adicionou membro de equipa? (+10%)
- Mostra barra de progresso com percentagem e lista de itens por completar com CTAs
- Dismissível pelo utilizador (guarda estado em localStorage)
- Desaparece automaticamente quando 100% ou quando o utilizador dismiss
- Renderizado no Dashboard.tsx logo após o Welcome, antes dos KPIs

### 4. `src/pages/Dashboard.tsx` — Integrar o novo widget

- Importar e renderizar `DashboardSetupProgress` entre Welcome e KPI Strip
- Passar dados necessários (profile, obras count, orcamentos count, etc.)

### 5. `src/components/dashboard/index.ts` — Exportar novo componente

## Direção Visual

- Setup Progress: Card com borda `border-primary/20`, barra de progresso com cor primary, lista de checkmarks verde/cinza
- Insights: Fundo `bg-primary/5` com ícone `Lightbulb` dourado, texto em `text-foreground`
- KPIs vazios: Subtitles motivacionais em `text-emerald-600` quando positivo (sem risco)

## Ficheiros Alterados

1. `src/components/dashboard/DashboardKPIStrip.tsx`
2. `src/components/dashboard/DashboardPriorities.tsx`
3. `src/components/dashboard/DashboardSetupProgress.tsx` (novo)
4. `src/components/dashboard/index.ts`
5. `src/pages/Dashboard.tsx`

