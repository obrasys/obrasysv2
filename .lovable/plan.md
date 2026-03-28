

# Plano: Conectar Livro de Ponto com Subempreiteiros e Equipa (Recursos)

## Objetivo

Permitir que ao gerir trabalhadores no Livro de Ponto, o utilizador possa associar cada trabalhador a um **Subempreiteiro** ou a um membro da **Equipa** (do módulo Recursos). Ao lançar horas, poder filtrar trabalhadores por subempreiteiro ou equipa.

## Alterações

### 1. Migração: Adicionar colunas à tabela `workers`
- `subempreiteiro_id UUID REFERENCES public.subempreiteiros(id) ON DELETE SET NULL`
- `equipa_membro_id UUID REFERENCES public.equipa_membros(id) ON DELETE SET NULL`

### 2. Tipos (`src/types/livro-ponto.ts`)
- Adicionar `subempreiteiro_id: string | null` e `equipa_membro_id: string | null` ao tipo `Worker`
- Adicionar campos joined: `subempreiteiro?: { id: string; nome: string }` e `equipa_membro?: { id: string; nome: string }`

### 3. Hook (`src/hooks/useLivroPonto.ts`)
- `useWorkers`: fazer join com `subempreiteiros(id, nome)` e `equipa_membros(id, nome)`
- `useCreateWorker` / `useUpdateWorker`: incluir `subempreiteiro_id` e `equipa_membro_id`

### 4. Página Trabalhadores (`src/pages/livro-ponto/Trabalhadores.tsx`)
- Adicionar dois campos `Select` no formulário: **Subempreiteiro** e **Membro Equipa** (ambos opcionais)
- Usar `useSubempreiteiros` e `useEquipaMembros` do hook `useRecursos`
- Adicionar colunas "Subempreiteiro" e "Equipa" na tabela de listagem

### 5. Página Lançar Horas (`src/pages/livro-ponto/Lancar.tsx`)
- Adicionar filtro opcional por Subempreiteiro e/ou Equipa antes do select de Trabalhador
- Filtrar a lista de trabalhadores conforme a seleção

## Ficheiros a modificar
- Nova migração SQL
- `src/types/livro-ponto.ts`
- `src/hooks/useLivroPonto.ts`
- `src/pages/livro-ponto/Trabalhadores.tsx`
- `src/pages/livro-ponto/Lancar.tsx`

