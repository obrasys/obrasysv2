

# Plano: Formato Duplo de PDF (Completo Tecnico + Comercial Resumido)

## Resumo

Adicionar a capacidade de gerar orçamentos em dois formatos: o atual "Completo Tecnico" (com artigos, quantidades, precos) e um novo "Comercial Resumido" (narrativo, sem detalhe tecnico, com introdução comercial, resumos por capitulo, exclusões, condições e assinatura).

---

## 1. Migração de Base de Dados

### Tabela `orcamentos` — novos campos:
- `client_document_mode_default` (text, default `'tecnico'`)
- `commercial_intro_text` (text, nullable)
- `commercial_payment_terms_text` (text, nullable)
- `commercial_validity_text` (text, nullable)
- `commercial_notes_text` (text, nullable)
- `show_signature_block` (boolean, default false)

### Tabela `capitulos_orcamento` — novos campos:
- `client_summary_title` (text, nullable)
- `client_summary_text` (text, nullable)
- `client_exclusions_text` (text, nullable)
- `include_in_client_summary` (boolean, default true)
- `client_summary_order` (integer, nullable)

### Nova tabela `budget_documents`:
- `id` (uuid, PK)
- `user_id` (uuid, FK auth.users)
- `budget_id` (uuid, FK orcamentos)
- `document_type` (text — 'pdf')
- `view_mode` (text — 'tecnico' | 'comercial')
- `storage_path` (text)
- `generated_at` (timestamptz)
- `sent_to_email` (text, nullable)
- `sent_at` (timestamptz, nullable)
- `created_at` (timestamptz)

RLS: users can only access their own documents.

Storage: criar bucket `budget-documents` (privado) para guardar PDFs gerados.

---

## 2. Tipos TypeScript

### `src/types/orcamentos.ts`
- Adicionar campos comerciais a `Orcamento` e `Capitulo`.
- Adicionar interface `BudgetDocument`.

---

## 3. Editor de Orçamento — Resumo Comercial por Capítulo

### `src/components/orcamentos/CapituloAccordion.tsx`
- Adicionar tab/secção "Resumo para Cliente" dentro de cada capítulo expandido.
- Campos: titulo comercial, texto resumido, exclusões, checkbox "incluir no resumo".
- Salvar via `updateCapitulo` existente.

### `src/pages/orcamentos/Editar.tsx`
- Adicionar tab "Configuração Comercial" no editor com:
  - Texto de introdução comercial
  - Condições de pagamento
  - Validade
  - Notas/observações
  - Toggle de bloco de assinatura
  - Formato por defeito (tecnico/comercial)

---

## 4. Gerador de PDF Comercial Resumido

### `src/lib/orcamento-pdf-comercial.ts` (novo ficheiro)
Gera PDF com layout narrativo:
- Cabeçalho (logo, empresa, nº orçamento, data, cliente, obra)
- Introdução comercial
- Blocos por capítulo (titulo comercial, texto resumido, exclusões) — sem artigos/precos/quantidades
- Total final (calculado do orçamento real)
- Condições de pagamento, validade, notas
- Bloco de assinatura opcional
- Rodapé institucional

Usa os mesmos COLORS, ensureSpace, addFooter do motor existente.

---

## 5. Seletor de Formato no PDF e Envio

### `src/pages/orcamentos/Ver.tsx`
- "Gerar PDF" abre modal com escolha: Completo Tecnico / Comercial Resumido.
- Preview simples do layout selecionado (mini mockup ou descrição).
- Ao gerar, guarda snapshot em `budget_documents` + upload ao storage.

### `src/components/orcamentos/EnviarOrcamentoDialog.tsx`
- Adicionar selector de formato antes do envio.
- Gerar PDF no formato escolhido, guardar snapshot, enviar.

---

## 6. Hook de Documentos

### `src/hooks/useBudgetDocuments.ts` (novo)
- Query para listar documentos gerados de um orçamento.
- Mutation para criar documento (gerar PDF, upload storage, insert registro).
- Função de download via signed URL.

---

## 7. Ficheiros Alterados

| Ficheiro | Alteração |
|---|---|
| Migração SQL | Novos campos + tabela `budget_documents` |
| `src/types/orcamentos.ts` | Novos campos nos tipos |
| `src/components/orcamentos/CapituloAccordion.tsx` | Secção "Resumo para Cliente" |
| `src/pages/orcamentos/Editar.tsx` | Tab "Configuração Comercial" |
| `src/lib/orcamento-pdf-comercial.ts` | Novo gerador PDF comercial |
| `src/lib/orcamento-pdf.ts` | Pequenos ajustes para exportar helpers partilhados |
| `src/pages/orcamentos/Ver.tsx` | Modal seletor de formato + snapshot |
| `src/components/orcamentos/EnviarOrcamentoDialog.tsx` | Seletor de formato |
| `src/hooks/useBudgetDocuments.ts` | Novo hook |
| `src/hooks/useOrcamentos.ts` | Suporte aos novos campos nos mutations |

