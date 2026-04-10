

# Remover CTA de Orçamento e Adicionar Escolha ao Botão "Novo Orçamento"

## Resumo

Remover o card "Criar Orçamento em 3 Passos" do Dashboard e transformar o botão "Novo Orçamento" no DashboardWelcome num dropdown/popover que permite ao utilizador escolher entre "Essencial" (~5 min) e "Avançado" (~15 min).

## Alterações

### 1. `src/pages/Dashboard.tsx`
- Remover o bloco do card "Criar Orçamento em 3 Passos" (linhas 149-163)
- Remover import `Sparkles` se não for usado noutro lugar

### 2. `src/components/dashboard/DashboardWelcome.tsx`
- Substituir o botão simples "Novo Orçamento" por um `Popover` (ou `DropdownMenu`) com duas opções:
  - **Essencial** — "~5 minutos" → navega para `/orcamentos/essencial/novo`
  - **Avançado** — "~15 minutos" → navega para `/orcamentos/criar`
- Cada opção mostra o nome e o tempo médio estimado
- O botão principal mantém o visual actual (outline, ícone FileText, texto "Novo Orçamento")

## Direção Visual

- Dropdown com 2 itens, cada um com título bold e subtítulo em `text-muted-foreground` com o tempo
- Essencial pode ter ícone `Sparkles`, Avançado ícone `FileText`

## Ficheiros Alterados

1. `src/pages/Dashboard.tsx`
2. `src/components/dashboard/DashboardWelcome.tsx`

