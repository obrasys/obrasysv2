# Observações padrão do PDF de orçamento editáveis

## Contexto
Hoje a frase que a cliente refere está **fixa no código** em `src/lib/orcamento-pdf.ts` (linhas 487-492), na secção "Observações" do PDF técnico do orçamento:

```
• Este orçamento é válido por 30 dias a contar da data de emissão.
• Os preços apresentados incluem todos os materiais e mão de obra necessários.
• Eventuais trabalhos adicionais não contemplados serão orçamentados separadamente.
• Condições de pagamento a acordar.
```

Não existe nenhum sítio na app onde estes textos possam ser alterados — por isso a cliente não os consegue editar. Já existem campos editáveis (`commercial_payment_terms_text`, `commercial_validity_text`, `commercial_notes_text`) mas só são usados no PDF **Comercial** (`orcamento-pdf-comercial.ts`), e estão por orçamento.

## O que vou fazer

### 1. Adicionar default global em Definições
- Nova coluna `default_budget_observations text` em `profiles` (texto multi-linha, uma observação por linha).
- Em **Definições → Empresa / Orçamentos**, novo bloco "Observações padrão dos orçamentos" com `Textarea` e botão guardar, pré-preenchido com os 4 bullets atuais (para não quebrar nada para quem não alterar).
- Texto de ajuda: "Uma observação por linha. Aparece no rodapé de todos os PDFs de orçamento. Pode ser substituído individualmente em cada orçamento."

### 2. Permitir override por orçamento
- Nova coluna `observations_text text null` em `orcamentos`.
- Na página **Editar orçamento**, na secção "Apresentação ao Cliente" (onde já estão Condições de pagamento / Validade / Notas), adicionar campo `Textarea` "Observações do rodapé" — quando preenchido sobrepõe o default global.

### 3. PDF técnico (`src/lib/orcamento-pdf.ts`)
- Substituir o array fixo por: `orcamento.observations_text` → senão `profile.default_budget_observations` → senão fallback aos 4 bullets atuais.
- Dividir por linhas (`\n`), prefixar com `• ` se a linha ainda não começar com bullet.

### 4. PDF comercial
- Sem alterações de comportamento; continua a usar `commercial_notes_text` (que já é editável).

## Como a cliente vai editar (caminho a comunicar)
> "**Definições → Empresa → Observações padrão dos orçamentos**" para alterar para todos os orçamentos novos, ou
> "**Orçamento → Editar → Apresentação ao Cliente → Observações do rodapé**" para alterar só naquele orçamento.

## Resposta sugerida à cliente (PT-PT)
> Olá [Nome], obrigado pelo feedback. Já passou a ser possível editar essas observações: vá a **Definições → Empresa → Observações padrão dos orçamentos** e altere o texto (uma observação por linha). Se quiser uma redação diferente apenas para um orçamento específico, edite-o e use o campo **Observações do rodapé** na secção "Apresentação ao Cliente". Esse texto passa a substituir o padrão nesse PDF. Qualquer coisa, estamos cá. — Antonio Cavalcanti

## Ficheiros
- migration: nova coluna em `profiles` e `orcamentos`
- `src/types/orcamentos.ts` — adicionar `observations_text?: string | null`
- `src/pages/Definicoes.tsx` (ou `empresa/GestaoEmpresa.tsx`, confirmo no momento) — novo bloco
- `src/pages/orcamentos/Editar.tsx` — novo Textarea
- `src/lib/orcamento-pdf.ts` — passar a ler de profile/orcamento
- `src/hooks/useGestaoEmpresa.ts` — incluir o novo campo
