
# Axia -- Identidade e Integração UI

## Resumo

Transformar a camada "IA Invisível" existente na marca **Axia**, adicionando identidade visual premium, badge de status dinâmico, painel lateral melhorado, pagina dedicada com dashboard e secção de configuração. Todo o backend ja esta implementado -- este plano e 100% frontend.

---

## 1. Identidade Visual Axia (Componente partilhado)

Criar `src/components/axia/AxiaIcon.tsx`:
- Icone SVG minimalista (circulo com nucleo central, estilo "eixo")
- Cor primaria: `#7C3AED` (roxo tecnologico) com variante `#2563EB` (azul)
- Componente reutilizavel com props de tamanho

Criar `src/components/axia/AxiaBranding.tsx`:
- Nome "Axia" + subtitulo "Inteligencia ativa"
- Classes Tailwind com a cor roxa como accent

---

## 2. Badge de Status Dinamico no Orcamento

Criar `src/components/axia/AxiaStatusBadge.tsx`:
- Tres estados baseados nos insights ativos do hook `useAIBudgetInsights`:
  - Verde: "Axia: Configuracao equilibrada" (0 insights criticos e 0 warn)
  - Amarelo: "Axia: Atencao a margem" (tem warns mas 0 criticos)
  - Vermelho: "Axia: Risco de desvio identificado" (tem criticos)
- Tooltip no hover com explicacao do motivo
- Animacao sutil (pulse) quando novos insights surgem
- Posicionado ao lado do `ResumoTotal` na pagina `Editar.tsx`

---

## 3. Painel Lateral Axia Insights (Refactor do SmartInsightsPanel)

Refactorizar `src/components/orcamentos/SmartInsightsPanel.tsx`:
- Titulo: "Axia Insights" com subtitulo "Analise estrategica do orcamento"
- Usar `AxiaIcon` no lugar do icone Sparkles
- Cor accent roxa (#7C3AED) no border e headers
- Maximo 5 insights visiveis (ordenados por severidade: critical > warn > info)
- Se 0 insights open, nao mostrar o painel (esconder completamente)
- Botao "Reanalisar" mantido
- Modal de confirmacao ao clicar "Aplicar":
  - Texto: "Axia ira adicionar X itens ao orcamento."
  - Botoes: Confirmar / Cancelar
- Toast apos aplicar: "Atualizacao aplicada com sucesso por Axia"

---

## 4. Pagina Dedicada `/axia`

Criar `src/pages/axia/Index.tsx`:
- Dashboard com:
  - **Axia Score (0-100)**: Indicador circular visual
    - Calculo: baseado em margem (peso 40%), desvios/outliers (peso 30%), itens em falta (peso 30%)
    - Dados vem do hook `useAIBudgetInsights` agregado
  - **Indicadores**: Margem projetada, risco de desvio, itens criticos
  - **Historico de decisoes**: Lista das acoes aplicadas (query a `ai_budget_actions_log`)
  - Texto institucional: "Axia e o motor inteligente do Obra Sys. Analisa orcamentos, identifica riscos e ajuda a proteger a sua margem."
  - Texto: "Axia aprende com cada obra."

Criar hook `src/hooks/useAxiaDashboard.ts`:
- Query a `ai_budget_insights` agrupado por budget
- Query a `ai_budget_actions_log` para historico
- Calculo do Axia Score

Adicionar rota em `App.tsx`:
```
/axia -> ManagerRoute -> AxiaPage
```

Adicionar item no `MAIN_NAV_ITEMS` em `navigation.ts`:
- Posicao: apos "Relatorios"
- Label: "Axia"
- Icone: lucide `BrainCircuit` (mais proximo do conceito, sem emoji)

---

## 5. Configuracao Axia (em Definicoes)

Adicionar nova secção card em `src/pages/Definicoes.tsx`:
- Titulo: "Axia" com icone
- Opcoes (usando `Switch`):
  - Ativar Axia (maps to `company_ai_settings.enabled`)
  - Permitir recomendacoes automaticas (maps to `llm_enabled`)
  - Ativar modo preditivo (beta) -- toggle visual, sem funcionalidade real por agora
- Inputs:
  - Margem minima (%) -- `min_margin_percent`
  - Sensibilidade de alerta (Select: Baixa=3.5 / Media=2.5 / Alta=1.5) -- maps to `outlier_zscore`
- Usa `useCompanyAISettings` hook existente para carregar/salvar

---

## 6. Microinteracoes

- Badge Axia: animacao `animate-pulse` quando `counts.total` muda de 0 para >0
- Badge verde com transicao `transition-all duration-500`
- Sem exagero -- apenas transicoes CSS suaves

---

## 7. Ficheiros a criar/editar

| Ficheiro | Acao |
|---|---|
| `src/components/axia/AxiaIcon.tsx` | Criar -- icone SVG |
| `src/components/axia/AxiaStatusBadge.tsx` | Criar -- badge dinamico |
| `src/components/orcamentos/SmartInsightsPanel.tsx` | Editar -- rebrand para Axia |
| `src/pages/axia/Index.tsx` | Criar -- dashboard |
| `src/hooks/useAxiaDashboard.ts` | Criar -- dados do dashboard |
| `src/pages/orcamentos/Editar.tsx` | Editar -- adicionar AxiaStatusBadge |
| `src/config/navigation.ts` | Editar -- adicionar item Axia |
| `src/App.tsx` | Editar -- adicionar rota /axia |
| `src/pages/Definicoes.tsx` | Editar -- secção de configuração Axia |

Nenhuma alteracao de base de dados necessaria -- toda a infraestrutura backend ja esta implementada.
