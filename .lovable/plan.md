

# Fase 1 — Ajuste: Mover Subscrição, Definições e Suporte para dentro do sidebar scrollável

## Problema

Atualmente, Subscrição, Definições e Suporte ficam num footer fixo (`flex-shrink-0`) com `border-t`, ocupando espaço permanente no fundo do sidebar. Quando há muitos items de navegação, isso reduz a área útil de scroll.

## Solução

Integrar esses 3 items como um **6º grupo** dentro da área scrollável do sidebar, chamado **"Conta & Suporte"**, posicionado após o grupo "Relatórios & IA" (e antes da secção Admin, se visível).

### Estrutura final dos grupos no sidebar:

```text
VISÃO GERAL
  Dashboard

OPERAÇÃO
  Obras, Orçamentos, Tarefas, RDOs, Autos de Medição, Conformidade

COMERCIAL
  Clientes, Fornecedores, Base de Preços

RECURSOS & FINANCEIRO
  Financeiro, Recursos, Instalações

RELATÓRIOS & IA
  Relatórios, Axia, Importar Dados

CONTA & SUPORTE          ← novo grupo (era footer fixo)
  Subscrição
  Definições
  Suporte

ADMINISTRAÇÃO (super admin only)
```

### Alterações

**`src/config/navigation.ts`** — Adicionar o grupo "Conta & Suporte" com os 3 items (Subscrição `/subscricao` com `CreditCard`, Definições `/definicoes` com `Settings`, Suporte `/suporte` com `HelpCircle`) no array `NAV_GROUPS`.

**`src/components/layout/Sidebar.tsx`** — Remover o bloco `<div className="flex-shrink-0 p-4 border-t ...">` (linhas 88-123) que contém os 3 botões fixos. Como todos os items agora vêm de `NAV_GROUPS`, a secção `<nav>` scrollável renderiza tudo incluindo estes 3 items no seu grupo.

Resultado: o sidebar fica inteiramente scrollável, sem footer fixo, e os items de conta/suporte acompanham o scroll como qualquer outro módulo.

