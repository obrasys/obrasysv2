# Hierarquia Zona/Área + Cabeçalho Profissional — Orçamento Essencial

## Auditoria do schema atual (confirmado)

- Capítulos vivem em **`capitulos_orcamento`** (FK `orcamento_id` → `orcamentos`). Não tem `organization_id` nem `obra_id` próprios.
- Serviços/artigos vivem em **`artigos_orcamento`** (FK `capitulo_id` → `capitulos_orcamento`).
- `orcamentos` tem `obra_id`; multi-tenant é resolvido via `obras → organization_id`.
- Não existe coluna `website` na empresa. Dados da empresa vivem em **`profiles`** (`empresa_nome`, `empresa_nif`, `empresa_morada`, `empresa_cidade`, `empresa_codigo_postal`, `empresa_pais`, `empresa_telefone`, `empresa_email`, `empresa_logo_url`). Vou usar estes campos.
- O fluxo do Essencial está em `src/pages/orcamentos/Essencial.tsx` + `src/components/orcamentos/essencial-v2/*` (BudgetSummaryTable, ItemSelectorModal, etc.).
- Exportação atual: `src/lib/orcamento-pdf-comercial.ts` (já lê dados da empresa do profile).

A implementação é **aditiva**: capítulos, artigos, totais e exportações existentes mantêm-se. Zona/Área são opcionais.

---

## Fase 1 — Base de dados (migração)

Novas tabelas, ligadas ao orçamento via `orcamento_id` (alinhado com `capitulos_orcamento`) para evitar duplicar caminhos:

**`budget_zones`**
- `id`, `orcamento_id` (FK), `capitulo_id` (FK obrigatória), `nome`, `descricao`, `ordem`, `created_at`, `updated_at`.

**`budget_areas`**
- `id`, `orcamento_id` (FK), `capitulo_id` (FK obrigatória), `zone_id` (FK obrigatória), `nome`, `descricao`, `ordem`, `created_at`, `updated_at`.

**`artigos_orcamento`** — adicionar (nullable):
- `zone_id uuid` (FK `budget_zones`)
- `area_id uuid` (FK `budget_areas`)
- `chapter_id` já existe como `capitulo_id` (obrigatório, mantido).

**Integridade** (via CHECK + trigger):
- `budget_areas.capitulo_id` = `budget_zones.capitulo_id` da zona referenciada.
- Em `artigos_orcamento`: se `area_id IS NOT NULL` então `zone_id IS NOT NULL`; e `area.zone_id = artigo.zone_id`, `zone.capitulo_id = artigo.capitulo_id`.

**RLS multi-tenant** (mesmo padrão usado em `capitulos_orcamento`): via JOIN `orcamentos → obras.organization_id` com `has_organization_access(...)`. GRANT `SELECT/INSERT/UPDATE/DELETE` a `authenticated`, `ALL` a `service_role`.

**Índices**: `(orcamento_id)`, `(capitulo_id)`, `(zone_id)` em areas; `(zone_id)`, `(area_id)` em `artigos_orcamento`.

Compatibilidade: orçamentos antigos continuam válidos (zone_id/area_id ficam NULL).

## Fase 2 — Formulário de serviço com cascata

Atualizar `ItemSelectorModal` / formulário de item do Essencial:
1. Selecionar Capítulo (já existe).
2. Selecionar Zona — Select filtrado pelas zonas do capítulo, com botão "+ Nova zona" inline (cria em `budget_zones`).
3. Selecionar Área — Select filtrado pelas áreas da zona, com botão "+ Nova área" inline.
4. Restantes campos do serviço.

Regras de UI: ao mudar Capítulo limpa Zona/Área se não pertencerem; ao mudar Zona limpa Área. Zona e Área permanecem opcionais.

Novo hook `useBudgetZonesAreas(orcamentoId)` com queries + mutations (criar/editar/apagar zona e área) e invalidações.

## Fase 3 — Aba "Zonas e Áreas"

Nova aba na página do Essencial (`Essencial.tsx`) com árvore `Capítulo → Zona → Área → Serviços`:
- Linhas "Sem zona" / "Sem área" agrupam órfãos.
- Cada nó mostra: custo total, venda total, margem (€), margem (%). Divisão por zero → 0%.
- Expand/collapse por nível; contagem de serviços por área e zona.
- Vista clássica por capítulos continua disponível na aba existente.

Cálculos feitos em cliente a partir de `artigos_orcamento` (determinísticos, sem IA): total serviço = `quantidade * preco_unitario`; agregações por área, zona e capítulo.

## Fase 4 — Exportações PDF/Excel com cabeçalho profissional

Em `src/lib/orcamento-pdf-comercial.ts` (PDF) e novo `orcamento-excel.ts` (xlsx):

- Cabeçalho 1ª página: logo + nome + NIF + morada/CP/cidade/país + email + telefone (campos vazios ocultos, sem quebrar). Não incluo `website` (campo não existe no schema; posso adicionar depois se quiseres).
- Cabeçalho reduzido nas páginas seguintes: logo + nome + referência orçamento + nº página.
- Bloco obra/cliente: nome da obra, morada da obra, cliente, data, código, versão.
- 3 modos de agrupamento selecionáveis no diálogo de exportação:
  1. Por capítulos (atual)
  2. Por capítulos + zonas
  3. Por capítulos + zonas + áreas
- Totais a cada nível. Compatível com orçamentos sem zonas (cai automaticamente em "Sem zona"/"Sem área").

## Fase 5 — Validação

- Orçamento antigo (sem zonas) abre, edita e exporta sem alterações visíveis.
- Novo orçamento com `Cap 05 > Apto A > Quarto 1 > Pintura paredes` mostra totais corretos a cada nível.
- Exportação não quebra com empresa sem logo/morada.

---

## Notas técnicas

- Sigo o padrão de RLS de `capitulos_orcamento`/`artigos_orcamento` (acesso via `orcamento_id`→`obras.organization_id`).
- Triggers de validação em vez de CHECKs cross-table.
- Sem alterar tabelas ou colunas existentes; apenas adição de colunas nullable em `artigos_orcamento`.
- Sem campos `website` na empresa (não existe no schema). Posso adicionar `empresa_website` ao `profiles` numa Fase 4b se confirmares.

**Próximo passo**: começo pela migração (Fase 1) e depois aguardo aprovação antes de continuar a UI.