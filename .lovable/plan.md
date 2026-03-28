

# Plano: Reformular PDF Comercial para Corresponder ao Layout de Referência

## Objetivo

Alterar `src/lib/orcamento-pdf-comercial.ts` para que o PDF comercial resumido tenha exatamente o layout do anexo: cabeçalho igual ao PDF técnico (logo à esquerda, dados empresa ao centro, "ORÇAMENTO" à direita com código e data), artigos listados por capítulo como texto simples sem preços, total num bloco destacado, e rodapé com condições.

## Alterações — Ficheiro Único

### `src/lib/orcamento-pdf-comercial.ts`

**1. Cabeçalho — replicar o estilo do PDF técnico:**
- Logo à esquerda
- Nome empresa, NIF, morada, telefone/email ao centro
- "ORÇAMENTO" grande em azul à direita, código e data por baixo
- Linha separadora azul

**2. Título do orçamento + Cliente/Obra:**
- Título do orçamento em bold (ex: "Orçamento de Instalação de Ar Condicionado")
- `Obra: ...` em texto menor
- `Cliente: Nome` e `Obra: Nome` em bold

**3. Introdução comercial:**
- Texto livre como parágrafo normal

**4. Capítulos com artigos (sem preços):**
- Título do capítulo em bold (ex: "Eletricidade:")
- Listar cada **artigo real** do capítulo pela sua `descricao` — texto simples, sem bullet, sem preço, sem quantidade, sem unidade
- Se existir `client_summary_text`, usá-lo como fallback quando não há artigos
- Se existir `client_exclusions_text`, mostrar exclusões

**5. Total — bloco com borda:**
- Texto "Orçamento total e de: XX.XXX,XX€" dentro de um rectângulo com borda (como na referência)
- Usar `valorFinal` (com IVA incluído)

**6. Rodapé de condições:**
- `Condições de pagamento:` em bold + texto
- "Todos os valores já têm o IVA incluído"
- Validade
- `Nota:` em bold + texto
- Texto de fecho
- Bloco de assinatura (se ativo)

**7. Footer institucional:** manter páginas numeradas

## Resumo Técnico

Apenas 1 ficheiro alterado: `src/lib/orcamento-pdf-comercial.ts`. A mudança principal é:
- Cabeçalho passa de centrado para layout split (logo | info | título) igual ao técnico
- Capítulos passam a listar `artigos[].descricao` em vez de apenas `client_summary_text`
- Total passa a ter borda/caixa em vez de texto sublinhado

