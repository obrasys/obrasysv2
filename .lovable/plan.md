

# Geração Automática de Planeamento na Adjudicação

## O que será feito

Quando o utilizador adjudicar um orçamento, o sistema criará automaticamente o cronograma estimado (planeamento) da obra, usando a Axia para sugerir sequência, durações e dependências com base nos capítulos e artigos do orçamento adjudicado.

## Implementação

### 1. Edge Function `generate-estimated-schedule`

Criar `supabase/functions/generate-estimated-schedule/index.ts`:

- Recebe `obra_id`, `budget_id`, `user_id`, `awarded_amount`, `awarded_at`
- Lê `capitulos_orcamento` + `artigos_orcamento` do orçamento
- Envia à Axia (Gemini Flash via Lovable AI Gateway) com prompt estruturado pedindo:
  - Fases hierárquicas baseadas nos capítulos
  - Tarefas por artigo relevante
  - Durações estimadas em dias
  - Sequência lógica e dependências (FS)
  - Pesos financeiros derivados dos valores dos capítulos
- Cria `project_schedule_versions` com `type='estimated'`, `generated_by_type='axia'`, `approval_status='pending_validation'`
- Cria `project_schedule_tasks` com WBS, datas calculadas a partir da data de adjudicação, `budget_chapter_id` vinculado, pesos financeiros proporcionais ao valor do capítulo
- Cria `project_schedule_dependencies` (FS entre fases sequenciais)
- Cria `project_milestones` para início e conclusão

### 2. Modificar `useAdjudicacao.ts`

Após o passo 9 (portal do cliente), adicionar passo 10:
- Invocar `generate-estimated-schedule` com `obra_id`, `budget_id`, `user_id`, `awarded_amount`, `awarded_at`
- Não-crítico: envolvido em try/catch (falha silenciosa)
- Invalidar queries `schedule-versions` e `schedule-tasks`

### 3. Toast de sucesso atualizado

Atualizar a mensagem de sucesso para incluir referência ao planeamento gerado.

## Ficheiros alterados

| Ficheiro | Ação |
|----------|------|
| `supabase/functions/generate-estimated-schedule/index.ts` | Criar |
| `src/hooks/useAdjudicacao.ts` | Editar (adicionar chamada à edge function) |

## Lógica da Axia para geração do cronograma

O prompt estruturado pede à IA para devolver JSON com:
```text
{
  phases: [
    {
      name, wbs_code, duration_days, sort_order,
      budget_chapter_id, weight_financial,
      tasks: [{ name, duration_days, unit, quantity, sort_order }]
    }
  ],
  dependencies: [{ from_wbs, to_wbs, type: "FS", lag: 0 }]
}
```

As datas são calculadas server-side (não pela IA) usando a `awarded_at` como data de início, somando durações sequencialmente respeitando as dependências.

