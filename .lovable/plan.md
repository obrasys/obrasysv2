## Objetivo

Reestruturar o passo "Tipo / Itens" do **Orçamento Essencial** para seguir uma sequência lógica **Tipo → Zona → Tipo de Serviço → Itens**, com zonas residenciais pré-definidas e tipos de serviço sugeridos por zona. Corrigir também o campo de quantidade (aceitar decimais e remover o "0" fantasma).

Toda a alteração é **aditiva** — orçamentos antigos continuam a abrir e a imprimir normalmente.

---

## 1. Nova hierarquia visual no wizard

Hoje (passo "Tipo"): `Tipo de obra` → painel **"Áreas"** (chips de Pinturas, Elétrica, Cozinha, Casa de Banho…).

Passa a:

```text
┌──────────────────────────────────────┐
│ O que queres orçamentar?  (Tipo)     │  ← inalterado
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Zonas                       [+ Nova] │  ← NOVO (substitui "Áreas")
│ [Cozinha] [Sala] [Quarto] [WC] …     │
└──────────────────────────────────────┘
       ↓ (ao clicar numa zona)
┌──────────────────────────────────────┐
│ Cozinha · Tipos de Serviço           │  ← NOVO (modal/painel)
│ [Demolições] [Águas] [Elétrica]      │
│ [Pavimentos] [Pinturas] [Tetos] …    │
└──────────────────────────────────────┘
       ↓ (ao clicar num tipo de serviço)
┌──────────────────────────────────────┐
│ Cozinha › Pavimentos › Itens         │  ← reaproveita ItemSelectorModal
│ ☐ Pavimento flutuante  ☐ Cerâmico …  │
└──────────────────────────────────────┘
```

Cada item adicionado fica etiquetado com **Zona + Tipo de Serviço**, e essa combinação é o que aparece como agrupador no resumo e nos PDFs.

---

## 2. Catálogo de Zonas pré-definidas

Novo array `ZONAS_PREDEFINIDAS` (residencial PT). Mesma lista aplica-se a Remodelação, Construção Nova, LSF e ICF:

- Cozinha, Sala, Sala de Jantar, Quarto, Suite, Casa de Banho, WC Serviço, Hall, Corredor, Escritório, Lavandaria, Despensa, Garagem, Cave, Sótão, Varanda/Terraço, Jardim, Exterior, Comum/Geral.

Botão **"+ Nova zona"** mantido (custom por orçamento).

## 3. Catálogo de Tipos de Serviço por Zona

Mapa `SERVICOS_POR_ZONA` com sugestões iniciais (utilizador pode adicionar mais via "+ Outro"):

| Zona | Tipos de Serviço sugeridos |
|---|---|
| Cozinha | Demolições, Águas e Esgotos, Elétrica, Pavimentos, Revestimentos parede, Tetos/Sancas, Carpintaria (móveis/bancada), Pinturas, Eletrodomésticos, Ventilação |
| Casa de Banho / WC | Demolições, Águas e Esgotos, Impermeabilização, Elétrica, Pavimentos, Revestimentos parede, Tetos, Louças e torneiras, Pinturas |
| Quarto / Suite | Pavimentos, Pinturas (teto/paredes), Tetos/Sancas, Elétrica, Carpintaria (roupeiros) |
| Sala / Sala de Jantar | Pavimentos, Pinturas, Tetos/Sancas, Elétrica, AVAC |
| Hall / Corredor | Pavimentos, Pinturas, Tetos, Elétrica |
| Escritório | Pavimentos, Pinturas, Tetos, Elétrica/Redes |
| Lavandaria / Despensa | Águas e Esgotos, Elétrica, Pavimentos, Pinturas |
| Garagem / Cave / Sótão | Pavimentos, Pinturas, Elétrica, Impermeabilização |
| Varanda / Terraço / Exterior | Impermeabilização, Pavimentos, Serralharia/Caixilharia, Pinturas |
| Jardim | Piscinas, Águas, Jardinagem, Iluminação |
| Comum/Geral | Deslocação/Estaleiro, Demolições gerais, Imprevistos/TPU |

Cada "Tipo de Serviço" mapeia para uma `areaKey` existente do catálogo de itens (`AREAS_REMODELACAO` etc.), pelo que **toda a base de itens atual continua a alimentar o seletor** — não se perde nada.

## 4. Renomear coluna "Área" → "Tipo de Serviço"

- `BudgetSummaryTable.tsx`: label da coluna `area` passa a "Tipo de Serviço" e o valor mostrado fica `{Zona} · {Tipo de Serviço}` (em vez de só a área).
- `SelectedItemsPreview.tsx`: cabeçalho do agrupamento passa a "Zona › Tipo de Serviço".
- PDFs (`orcamento-pdf.ts`, `orcamento-pdf-comercial.ts`, `orcamento-pdf-zonas.ts`): título do capítulo continua a usar `zoneName / areaName / serviceTypeName`, basta passar Zona + Tipo de Serviço quando existirem.

## 5. Fix do campo Quantidade (bug "01" / não aceita decimais)

`SelectedItemsPreview.tsx` linhas 100-106:

- Substituir `parseInt` por `parseFloat`.
- Remover `min={1}` e `Math.max(1, …)`; passar a `min={0}` e `step="any"`.
- Manter estado local em string para o input (`qtyDraft`) para permitir limpar o campo, escrever `0.5`, `1,25`, etc., e só fazer commit no `onBlur` / `Enter`. Resolve o "01" (concatenação) e o "0" preso.

Validação no commit: se vazio ou `< 0`, repõe valor anterior; aceita até 3 casas decimais.

## 6. Compatibilidade e migração

- O tipo `BudgetItem` já tem `zoneName?` e `areaName?` opcionais. Adiciona-se `serviceTypeName?: string` (opcional).
- `areaKey` continua a existir e a mapear para o catálogo de itens — orçamentos antigos (sem `zoneName`/`serviceTypeName`) renderizam exatamente como hoje.
- Sem migração de DB nesta fase: usa-se o `artigos_orcamento.service_type_name` já existente (criado em fase anterior).
- Drafts em `localStorage` antigos: o `loadDraft` ignora campos extra, mantendo retrocompatibilidade.

---

## Ficheiros tocados

| Ficheiro | Alteração |
|---|---|
| `src/types/orcamento-essencial.ts` | + `ZONAS_PREDEFINIDAS`, `SERVICOS_POR_ZONA`, `serviceTypeName?` em `BudgetItem` |
| `src/components/orcamentos/essencial-v2/AreasGrid.tsx` | Renomeado para `ZonasGrid` (mantido como wrapper export para retrocompat); título "Zonas", chips das zonas pré-definidas, "+ Nova zona" |
| **NOVO** `src/components/orcamentos/essencial-v2/ServicosPorZonaModal.tsx` | Modal que abre ao clicar numa zona, mostra os tipos de serviço sugeridos + "Outro…", e despoleta o `ItemSelectorModal` para o tipo escolhido |
| `src/components/orcamentos/essencial-v2/ItemSelectorModal.tsx` | Aceita `zoneName` + `serviceTypeName` e injecta nos `BudgetItem` criados |
| `src/components/orcamentos/essencial-v2/SelectedItemsPreview.tsx` | Cabeçalho "Zona › Tipo de Serviço"; fix do input de quantidade (decimais + sem "01") |
| `src/components/orcamentos/essencial-v2/BudgetSummaryTable.tsx` | Coluna `area` passa a "Tipo de Serviço" e mostra `Zona · Serviço` |
| `src/pages/orcamentos/Essencial.tsx` | Orquestra novo fluxo (estado da zona seleccionada, abertura do modal de serviços, propagação de `zoneName`/`serviceTypeName`) |

Nenhum ficheiro removido, nenhuma rota alterada, nenhum endpoint mexido.

## Critérios de aceitação

1. Ao escolher "Remodelação", aparece o painel **Zonas** com as zonas residenciais pré-definidas (Cozinha, Sala, Quarto, WC…).
2. Clicar em "Cozinha" abre um painel com tipos de serviço sugeridos para essa zona (Pavimentos, Pinturas, Elétrica…).
3. Clicar num tipo de serviço abre o seletor de itens existente, e os itens adicionados ficam etiquetados com **Cozinha · Pavimentos**.
4. No resumo e nos 3 PDFs (técnico/comercial/zonas) os itens aparecem agrupados por **Zona › Tipo de Serviço**.
5. Coluna "Área" passa a chamar-se "Tipo de Serviço" em toda a UI do Essencial.
6. No campo Quantidade consigo escrever `0.5`, `1,25`, `3` sem ficar preso em `0` nem aparecer `01`.
7. Abrir um orçamento Essencial antigo continua a funcionar e a imprimir sem erros.