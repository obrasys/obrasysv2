

## Plano: Custos Extra na Dashboard da Obra (Almoços, Gasóleo, etc.)

### Situação Atual
O sistema financeiro já tem a tabela `contas_financeiras` com `origem = 'outros'` e suporte a categorias via `categorias_financeiras`. No entanto, não há atalhos rápidos para lançar custos operacionais do dia-a-dia como almoços, gasóleo, portagens, etc.

### Abordagem
Criar um componente dedicado **"Custos Extra"** como novo separador na página Financeiro da obra, com botões de lançamento rápido para categorias comuns e uma tabela resumo. Reutiliza a infraestrutura existente (`contas_financeiras` com `origem = 'outros'`), sem necessidade de migração.

### O que será feito

**1. Componente `ObraCustosExtrasTab`** (novo ficheiro)
- Linha de KPIs: total almoços, total gasóleo, total outros extras (mês corrente e acumulado)
- Botões de lançamento rápido com ícones para: Almoço, Gasóleo, Portagens, Estacionamento, Material diverso, Outros
- Cada botão abre um mini-formulário inline (valor, data, descrição opcional) — sem modal pesado
- Tabela de registos com filtro por tipo de custo extra e período
- Gráfico de distribuição por tipo (donut)

**2. Integração na página `Financeiro.tsx`**
- Novo separador "Custos Extra" na TabsList existente (ao lado de RH, Material, etc.)
- O balanço da obra passa a incluir os custos extras no cálculo de despesas

**3. Dados pré-configurados**
- Constantes com tipos de custo extra comuns (almoços, gasóleo, portagens, estacionamento, ferramentas, deslocações) com ícones e cores
- Os lançamentos usam `origem = 'outros'` + `descricao` com tag do tipo para filtrar

### Ficheiros a criar/editar
| Ficheiro | Ação |
|---|---|
| `src/components/obras/ObraCustosExtrasTab.tsx` | **Criar** — componente completo |
| `src/pages/obras/Financeiro.tsx` | **Editar** — adicionar tab "Custos Extra" |
| `src/components/obras/index.ts` | **Editar** — export do novo componente |

### Detalhes técnicos
- Os custos são gravados na tabela `contas_financeiras` existente com `tipo = 'pagar'`, `origem = 'outros'` e a `descricao` prefixada com tag (ex: `[ALMOÇO]`, `[GASÓLEO]`) para permitir filtragem
- Usa o hook `useFinanceiro` existente para criar/listar contas
- KPIs calculados em client-side a partir das contas filtradas por `origem = 'outros'`

