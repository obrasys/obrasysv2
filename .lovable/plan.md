## Objetivo

Adicionar à criação de **orçamento avançado** uma secção colapsável **"Dados da Obra (Ficha Técnica)"** com os 12 campos do anexo, todos **opcionais**. Estes dados ficam guardados no orçamento e são reutilizados automaticamente para preencher a **Folha de Fecho** (cabeçalho) e o **PDF comercial**.

## Campos a adicionar (todos opcionais)

| Campo | Tipo |
|---|---|
| Nome da Obra | texto |
| Nº / Lote Obra | texto |
| Designação | texto |
| Dono de Obra | texto |
| Regime Empreitada | select (Série de Preços, Preço Global, Administração Direta, Outro) |
| Tipo de Obra | select (Nova, Reabilitação, Ampliação, Conservação) |
| Localização | texto |
| Prazo (meses) | número |
| Nº Frações | número |
| Projeto Arquitectura | texto |
| Projeto Engenharia | texto |
| Responsável Orçamento | texto |

## Alterações

### 1. Base de dados
Adicionar coluna `project_metadata` (JSONB, default `{}`) à tabela `orcamentos` para guardar a ficha técnica sem inflar o schema.

### 2. Tipos (`src/types/orcamentos.ts`)
- Novo tipo `ProjectMetadata` com os 12 campos opcionais.
- Adicionar `project_metadata?: ProjectMetadata` em `Orcamento` e `OrcamentoFormData`.

### 3. Formulário (`src/components/orcamentos/OrcamentoForm.tsx`)
- Nova secção `<ProjectMetadataSection>` colapsável (default fechada), com aviso "Opcional — preenche automaticamente a Folha de Fecho e o PDF comercial".
- Grid responsivo 1/2/3 colunas a espelhar o layout do anexo.
- Schema Zod: todos os campos `.optional()`.

### 4. Hook (`src/hooks/useOrcamentos.ts`)
Incluir `project_metadata` no `insert`/`update` do `createOrcamento`/`updateOrcamento`.

### 5. Integração com Folha de Fecho
No `ClosingSheetFullView.tsx`, quando o `details` está vazio, semear também o `header` a partir de `orcamento.project_metadata` (nome_obra, dono_obra, localização, prazo, regime, tipo, nº frações, responsável).

## Notas técnicas
- Manter retrocompatibilidade: orçamentos antigos continuam a funcionar com `project_metadata = {}`.
- Sem alterações ao fluxo Essencial (apenas Avançado).
- Sem alterações de RLS — coluna herda as policies existentes da tabela `orcamentos`.
