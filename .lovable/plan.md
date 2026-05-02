## Objetivo
Adicionar a base "Remodelação" (~215 artigos do CSV) à Base de Preços, **separada** da base "Geral" atual, usando um campo `tipo_base` para segregar bibliotecas.

## 1. Migração de Schema

```sql
-- Coluna tipo_base nas duas tabelas (default 'geral' preserva dados atuais)
ALTER TABLE base_artigos_global 
  ADD COLUMN tipo_base TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN tipo_linha TEXT; -- 'SERVICO' | 'MATERIAL'

ALTER TABLE base_artigos_user 
  ADD COLUMN tipo_base TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN tipo_linha TEXT;

-- Permitir mesmo código em bases diferentes
ALTER TABLE base_artigos_global DROP CONSTRAINT IF EXISTS base_artigos_global_codigo_key;
ALTER TABLE base_artigos_global 
  ADD CONSTRAINT uniq_global_tipo_codigo UNIQUE (tipo_base, codigo);

-- Constraint check para valores válidos
ALTER TABLE base_artigos_global 
  ADD CONSTRAINT chk_tipo_base CHECK (tipo_base IN ('geral','remodelacao'));
ALTER TABLE base_artigos_user 
  ADD CONSTRAINT chk_tipo_base_user CHECK (tipo_base IN ('geral','remodelacao'));

CREATE INDEX idx_base_global_tipo ON base_artigos_global(tipo_base);
CREATE INDEX idx_base_user_tipo ON base_artigos_user(user_id, tipo_base);
```

## 2. Seed dos Artigos de Remodelação
Inserir os ~215 artigos do CSV em `base_artigos_global` com `tipo_base = 'remodelacao'`, preservando:
- Código (`REM-*`, `MAT-*`)
- Capítulo (Demolições, Materiais, Pavimentos, etc.)
- Tipo de linha (SERVICO/MATERIAL)
- Unidade e preço unitário

## 3. Hook `useBaseArtigos.ts`
- Adicionar parâmetro `tipoBase: 'geral' | 'remodelacao'` nos fetches.
- Filtrar queries por `tipo_base`.
- Função `importarBasePadrao(tipoBase)` copia apenas os artigos globais correspondentes para `base_artigos_user`.

## 4. UI — `ArtigosPanel.tsx`
Adicionar sub-tabs no topo do painel "Artigos":

```text
┌─ Artigos ─────────────────────────────┐
│  [ Geral ]  [ Remodelação ]           │
│  ─────────────────────────────────    │
│  🔍 Pesquisar...    [+ Novo] [Import] │
│  ▼ Capítulo 1 (n)                     │
│     ...                                │
└────────────────────────────────────────┘
```

- Tab ativa controla `tipoBase` passado ao hook.
- Botão "Importar Base Padrão" importa apenas artigos da tab ativa.
- Coluna extra opcional "Tipo" (SERVICO/MATERIAL) visível na tab Remodelação.

## 5. Link futuro com Orçamento
Quando o utilizador adicionar artigo a um orçamento via Base de Preços, o seletor mostrará as duas bibliotecas (Geral / Remodelação) como filtro — sem alterar a estrutura do orçamento.

## Ficheiros afetados
- `supabase/migrations/<timestamp>_add_tipo_base_remodelacao.sql` (schema + seed)
- `src/hooks/useBaseArtigos.ts`
- `src/components/base-precos/ArtigosPanel.tsx`
- `src/integrations/supabase/types.ts` (auto-regenerado)

## Compatibilidade
- Todos os artigos existentes ficam automaticamente em `tipo_base = 'geral'` — zero breaking changes.
- RLS atual mantém-se válida (filtra por `user_id`); apenas adicionamos filtro extra por `tipo_base` ao nível do hook.
