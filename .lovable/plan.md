## Objetivo

Transformar a Folha de Fecho num módulo económico completo, fiel ao modelo "FOLHA FECHO_Orç. inicial", com 17 blocos, catálogo de qualidades configurável por organização, discriminação detalhada de estaleiro, PDF que espelha o modelo, e fluxo formal aprovação → bloqueio → Final.

Arquitetura **híbrida**:
- **Tabelas dedicadas** para o que precisa de cross-query / dashboards: `site_cost_lines`, `sales_commercial_map_lines`, `org_quality_specs_catalog`, `closing_sheet_quality_specs`.
- **JSONB tipado** (em `closing_sheets.details`) para tudo o resto: terreno, indiretos, outros, admin, IVA, condicionantes, cabeçalho, aprovações.

Mantém retrocompatibilidade — folhas existentes continuam a funcionar via `mergeDetails`.

---

## Fase 1 — Expandir cabeçalho + blocos em falta na UI

### 1.1. Estender tipos (`src/types/closing-sheet.ts`)

Acrescentar ao `ClosingHeader`:
- `regime_empreitada`, `tipo_obra` (já existem mas vão para selects normalizados: Série de Preços / Preço Global / Administração Directa / Outro; Nova / Reabilitação / Ampliação / Conservação)
- Confirmar datas: `data_orc`, `inicio_obra`, `conclusao_obra`

Acrescentar novos blocos ao `ClosingSheetDetails`:
- `validation: { direccao_geral, validador_tecnico_economico, percentagem_lucro_alvo, valor_medio_fraccao, observacoes }`
- `approvals: { administracao_nome, administracao_data, aprovacao_inicial_nome, aprovacao_inicial_data, assinatura_url }`
- `quality_specs_values: Record<string, string>` (preenchimento de chaves do catálogo)

### 1.2. UI — `ClosingSheetFullView.tsx`

Reorganizar em **17 secções colapsáveis** seguindo a ordem do modelo:
1. Cabeçalho da obra (já existe, completar campos)
2. Validação técnico-económica (novo)
3. Aprovação inicial / administração (novo)
4. Custos directos (já existe)
5. Custos de estaleiro (já existe — adicionar link "Ver discriminação")
6. Custos do terreno (já existe, expor todos os campos IMT/Selo/Notário/Comissões/Sondagens/Topografia)
7. Custos indirectos (já existe)
8. Outros custos (já existe)
9. Custos administrativos (já existe)
10. Custos de IVA (já existe — adicionar checkboxes ARU/ORU já no detalhe)
11. Condicionantes da obra (novo bloco com 9 checkboxes Sim/Não + observações)
12. Qualidades da obra / Caderno de encargos (novo — usa catálogo configurável)
13. Mapa de vendas comercial (já existe — passar a tabela dedicada na Fase 2)
14. Dados estatísticos (já existe, expor fatores editáveis)
15. Proposta final / venda (sumário)
16. Resultado estimado / RAI (sumário)
17. Assinaturas e datas (novo)

Padrão visual: card colapsável com subtotal sempre visível no header.

---

## Fase 2 — Tabelas dedicadas (migrations)

### 2.1. Catálogo de qualidades configurável por organização

```sql
create table public.org_quality_specs_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  spec_key text not null,
  label text not null,
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  unique (organization_id, spec_key)
);
```

RLS: `organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())`.
Seed: ao primeiro acesso de cada org, carregar as 34 chaves do modelo Torres (fundações, estrutura, fachadas, AVAC, elevadores, etc).

### 2.2. Mapa de vendas comercial detalhado

```sql
create table public.closing_sheet_sales_lines (
  id uuid primary key default gen_random_uuid(),
  closing_sheet_id uuid not null references public.closing_sheets(id) on delete cascade,
  organization_id uuid not null,
  tipologia text not null,
  quantidade int default 0,
  area_priv numeric(14,2),
  preco_m2 numeric(14,2),
  total_amount numeric(14,2),
  sort_order int default 0,
  notes text,
  created_at timestamptz default now()
);
```

### 2.3. Discriminação de gastos de estaleiro

```sql
create table public.closing_sheet_site_detail_lines (
  id uuid primary key default gen_random_uuid(),
  closing_sheet_id uuid not null references public.closing_sheets(id) on delete cascade,
  organization_id uuid not null,
  category text not null check (category in
    ('site_labor','technical_staff','site_equipment','utilities','other_site_costs')),
  description text not null,
  useful_percent numeric(8,4),
  quantity numeric(14,4),
  months numeric(14,4),
  monthly_cost numeric(14,2),
  total_amount numeric(14,2) generated always as
    (coalesce(useful_percent,1) * coalesce(quantity,1) * coalesce(months,1) * coalesce(monthly_cost,0)) stored,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);
```

Trigger: ao alterar/inserir/apagar, recalcular `closing_sheets.site_costs` (soma das linhas) e propagar para `details.site_costs`.

RLS em todas: via `organization_id` + `is_super_admin()`.

### 2.4. Hooks

- `useQualitySpecsCatalog()` — CRUD do catálogo por org (UI em Definições).
- `useClosingSheetSalesLines(sheetId)` — CRUD do mapa de vendas.
- `useClosingSheetSiteDetail(sheetId)` — CRUD da discriminação de estaleiro.

---

## Fase 3 — Discriminação de Estaleiro (folha separada)

Nova rota/dialog: `/orcamentos/:id/folha-fecho/:sheetId/estaleiro`.

UI:
- 5 secções colapsáveis (Pessoal de obra / Pessoal técnico / Equipamentos / Outros gastos / Qualidades-link).
- Tabela editável inline com colunas: descrição, % útil, qtd, nº meses, custo/mês, **total calculado**.
- Botão "Adicionar linha" por secção, com presets (Director Projecto, Gestor Projecto, Encarregado Geral, etc).
- Subtotal por secção + total geral.
- Botão "Aplicar à Folha de Fecho" → escreve no campo `site_costs` da folha.

---

## Fase 4 — PDF completo + Fluxo aprovação/bloqueio

### 4.1. PDF — reescrever `src/lib/closing-sheet-pdf.ts`

Espelhar 100% o modelo Torres, na ordem dos 17 blocos:
- Capa com cabeçalho completo (15 campos) + versão da proposta
- Validação / Aprovação
- Custos diretos (tabela com %, valor, empresa, notas)
- Custos estaleiro (totais + opção "incluir discriminação detalhada" → páginas extra)
- Terreno detalhado (todas as parcelas IMT/Selo/etc)
- Indiretos / Outros / Admin / IVA
- Condicionantes (checklist Sim/Não)
- Qualidades / Caderno de encargos (chave + valor)
- Mapa de vendas comercial
- Dados estatísticos
- Sumário final: Custo Industrial, Custo Total, Valor Vendas, RAI €/%, K Venda, Custo/m²
- Bloco de assinaturas

Tipografia: H1 12pt bold teal, H2 9pt bold, body 8pt, micro 7pt (já estabelecido).
Cabeçalho repetido com logo + código + versão em todas as páginas. Footer com nº página.

### 4.2. Fluxo aprovação → bloqueio

- Botão **"Aprovar e bloquear"** na ClosingSheetFullView quando `status = 'draft'`.
- Edge function `approve-closing-sheet`: valida permissão, fixa `status = 'locked'`, `locked_at`, `locked_by`, **fotografa snapshot** no campo `snapshot` JSONB (cabeçalho + todos os totais + linhas).
- Após bloqueio, UI passa a read-only; só Super Admin pode reabrir (botão escondido).

### 4.3. Comparativo Inicial vs Final

Melhorar `ClosingSheetComparison.tsx`:
- Deltas em € e % para todos os 6 totais (directos, estaleiro, terreno, indirectos, outros, IVA)
- Delta de Vendas, RAI €, RAI %, K Venda
- Cores semânticas (verde melhor / vermelho pior, conforme natureza do indicador)
- Exportar comparativo em PDF (página única A4)

---

## Detalhes técnicos

- **Hooks afetados**: `useClosingSheets`, `useUpdateClosingSheetDetails` (adicionar suporte para os novos blocos JSONB), novos hooks da Fase 2.
- **Triggers DB**: recalcular totais de `closing_sheets` quando linhas dedicadas mudam.
- **Snapshot na aprovação**: garante que alterações posteriores ao orçamento base não afetam folhas já aprovadas.
- **Retrocompatibilidade**: `mergeDetails` em `src/types/closing-sheet.ts` já tolera campos em falta — basta adicionar defaults para os novos blocos.
- **Catálogo qualidades**: ao criar a primeira folha de fecho de uma org sem catálogo, fazer seed automático das 34 chaves Torres.
- **Sem alteração** ao fluxo Essencial.

---

## Ordem de execução sugerida

1. Migration: `org_quality_specs_catalog` + `closing_sheet_sales_lines` + `closing_sheet_site_detail_lines` + RLS + triggers + seed function.
2. Tipos + hooks novos.
3. UI expandida da Folha de Fecho (17 blocos) — Fase 1.
4. Página de Discriminação de Estaleiro — Fase 3.
5. PDF reescrito — Fase 4.1.
6. Fluxo aprovação/bloqueio + edge function — Fase 4.2.
7. Comparativo melhorado — Fase 4.3.

Cada passo é validável isoladamente no preview antes de avançar.
