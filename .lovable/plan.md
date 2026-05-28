# Adicionar "Observações do rodapé" ao Orçamento Essencial

## Contexto
No fluxo Avançado (Editar) já existe o campo. No Essencial (`src/pages/orcamentos/Essencial.tsx`) — wizard que cria orçamento no fim — não há esse campo, por isso o PDF gerado a partir do Essencial usa só o `default_budget_observations` global (ou fallback hardcoded).

## Alterações

### 1. `src/pages/orcamentos/Essencial.tsx`
- Novo estado `observationsText: string` (default `''`).
- Adicionar um `<Textarea>` "Observações do rodapé" entre `TotalsAdjustments` e `ClientIdentification` (passo E.1), envolvido num `Card` simples com texto de ajuda: "Deixe em branco para usar o padrão definido em Perfil → Empresa." (4 linhas).
- Incluir `observations_text: observationsText || null` no `insert` para `orcamentos` (linha ~392).
- Incluir `observations_text: observationsText || null` no objeto `orcamento` do `buildMockOrcamento` (linha ~240) para que o preview do PDF respeite o que foi escrito antes de gravar.

### 2. Limpeza
- Adicionar `setObservationsText('')` no `handleClear` (junto com os outros resets).

Sem alterações em BD, hooks, types ou no PDF — a coluna `orcamentos.observations_text` e a lógica de prioridade no `orcamento-pdf.ts` já estão prontas da iteração anterior.

## Como o utilizador vai usar
No final do Essencial, antes de identificar o cliente, aparece o campo "Observações do rodapé"; preenchido aplica-se a esse orçamento, vazio usa o padrão global.