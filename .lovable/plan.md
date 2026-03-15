

## Plano: Importar Orçamentos de Excel com organização por IA

### Conceito
Após o upload do Excel, a IA (via edge function) analisa as linhas brutas, identifica capítulos vs artigos, corrige unidades, agrupa por especialidade e devolve o orçamento estruturado no padrão ObraSys — pronto para inserir na base de dados.

### Alterações

**1. Instalar `xlsx`** — parsing de ficheiros Excel no browser

**2. `src/lib/excel-budget-parser.ts` (novo)**
- Lê o Excel com SheetJS e extrai linhas brutas (colunas flexíveis)
- Devolve array de `{col1, col2, ...colN}` sem assumir estrutura

**3. `supabase/functions/organize-budget-import/index.ts` (novo)**
- Recebe as linhas brutas do Excel como JSON
- Usa IA (Gemini 2.5 Flash via Lovable AI) para:
  - Identificar quais linhas são capítulos e quais são artigos
  - Agrupar artigos sob os capítulos corretos
  - Normalizar unidades (m², ml, un, vg, kg, m³)
  - Preencher campos em falta com valores sensatos
  - Devolver JSON estruturado: `{ titulo, capitulos: [{ titulo, artigos: [{ codigo, descricao, unidade, quantidade, preco_unitario }] }] }`

**4. `src/components/importar/ImportOrcamentoModal.tsx` (novo)**
- Modal com 4 passos:
  1. **Upload** — arrasta ou seleciona Excel/CSV
  2. **IA a processar** — envia linhas brutas à edge function, mostra loading
  3. **Preview** — tabela com capítulos/artigos organizados pela IA, editável antes de confirmar
  4. **Confirmar** — insere `orcamentos` → `capitulos_orcamento` → `artigos_orcamento`, redireciona para `/orcamentos/{id}`
- Permite ao utilizador definir título e margem de lucro antes de confirmar

**5. `src/pages/importar/Index.tsx`** — Adicionar categoria "Orçamentos" com ícone e redirecionamento para o modal

### Fluxo

```text
Excel → SheetJS (browser) → linhas brutas JSON
  → Edge Function (Gemini 2.5 Flash) → estrutura organizada
    → Preview editável → Confirmar
      → INSERT orcamentos + capitulos + artigos
        → Redirecionar para /orcamentos/{id}
```

### Segurança
- Edge function autenticada (JWT do utilizador)
- Limite de 500 linhas por importação
- RLS existente protege os inserts

### Ficheiros: 4 novos + 1 editado. Sem alterações de base de dados.

