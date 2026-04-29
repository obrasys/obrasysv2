# Plano: Fluxo Plantas → Medição → Intervenção → Orçamento → Axia

## Estado atual (verificado no código)

Boa parte das regras já está implementada:
- "Rodapé" já é o label visível no resumo, na etiqueta auto-gerada e no diálogo de área (`Detail.tsx` L463/735/991). A função `calculatePolygonPerimeter` (em `usePlanMeasurements.ts`) já soma todas as arestas do polígono fechado (≥3 pontos) — equivale a `calculateRodape`.
- O `PlanSegmentDialog` já implementa: 2 pontos → comprimento auto, pé direito editável, aberturas (porta/janela) com subtração, 5 ações (Demolir, Construir, Barrar, Pintar, Revestir), espessura obrigatória em Demolir, material da biblioteca (`materials`) em Construir, cálculo de volume de demolição.
- Persistência multi-registo (linha + área de parede + volume de demolição) em `handleConfirmSegment`.

Faltam três blocos para fechar o ciclo pedido: simplificação da toolbar, **metadados estruturados da intervenção** (hoje vão só em `observacao` em texto), e as camadas de **Orçamento** e **Axia** sobre cada medição.

---

## 1. Toolbar simplificada (Segmento apenas)

Em `PlanWorkflowBar.tsx` (`TOOLS`) remover `measure_count` (Contagem). Manter:
- `view` (Navegar)
- `measure_line` renomeado visualmente para "Segmento" (já está)

Atualizar `MODE_HINTS.measure_line` para texto curto: "2 cliques = parede isolada · 3+ cliques + duplo-clique = polígono fechado (Rodapé + Área)".

Em `Detail.tsx`, remover/ocultar o ramo `mode === "measure_count"` no `handleCanvasClick` (deixar o código mas torná-lo inacessível pela UI). Outros modos internos (`draw_room`, `draw_wall`, `draw_opening`, `insert_element`) continuam disponíveis via Symbol Picker / Axia, sem botão na barra principal.

## 2. Metadados estruturados da medição

Hoje a ação, espessura, material, etc. só ficam em `observacao` (texto livre) — não dá para ler de volta no orçamento nem na Axia. Vamos adicionar metadados em `plan_measurements`:

Migração:
```sql
alter table public.plan_measurements
  add column if not exists action_type text
    check (action_type in ('demolir','construir','barrar','pintar','revestir')),
  add column if not exists segment_length numeric(12,4),
  add column if not exists ceiling_height numeric(12,4),
  add column if not exists wall_area numeric(12,4),
  add column if not exists baseboard_length numeric(12,4),
  add column if not exists wall_thickness_cm numeric(12,4),
  add column if not exists demolition_volume numeric(12,4),
  add column if not exists material_id uuid references public.materials(id),
  add column if not exists material_label text,
  add column if not exists openings_area numeric(12,4),
  add column if not exists budget_link_status text not null default 'not_linked'
    check (budget_link_status in ('not_linked','suggested','linked','ignored')),
  add column if not exists budget_artigo_id uuid,
  add column if not exists axia_status text not null default 'not_analyzed'
    check (axia_status in ('not_analyzed','valid','warning','error')),
  add column if not exists axia_notes jsonb;

create index if not exists idx_plan_measurements_action on public.plan_measurements(action_type);
create index if not exists idx_plan_measurements_budget on public.plan_measurements(budget_link_status);
create index if not exists idx_plan_measurements_axia on public.plan_measurements(axia_status);
```

`measurement_type` (segment vs polygon) é derivado: `tipo='linha'` + 2 coords + `action_type` ⇒ segmento; `tipo='area'` ⇒ polígono. Não duplicamos coluna. Multi-tenant continua via `user_id` + RLS já existente (`get_org_member_ids()`).

Atualizar `usePlanMeasurements.addMeasurement` para aceitar e persistir os campos novos, e `PlanMeasurement` em `types/plan-measurements.ts`.

Em `handleConfirmSegment` (Detail.tsx) e no save do polígono (`handleConfirmSave`), gravar **uma única medição "principal"** com todos os metadados, em vez de 2-3 medições "satélite":
- Segmento → 1 registo (`tipo='linha'`, `action_type` setado, `segment_length`, `ceiling_height`, `wall_area`, `wall_thickness_cm`, `demolition_volume`, `material_id`, `openings_area`).
- Polígono fechado → 1 registo (`tipo='area'`, `valor_bruto = área`, `baseboard_length = rodapé`).

Isto elimina os "fantasmas" duplicados na lista, e faz com que cada parede seja um item único que pode ser ligado ao orçamento.

(Migração de retro-compat: registos antigos sem `action_type` continuam a funcionar, simplesmente não aparecem secções de Orçamento/Axia.)

## 3. Painel "Orçamento" no detalhe da medição

Novo componente `PlanMeasurementBudgetPanel.tsx` exibido no painel direito quando uma medição com `action_type` está selecionada.

Mapeamento ação → orçamento (em `src/lib/plan-budget-mapping.ts`):
```ts
const MAP = {
  demolir:   { capitulo: "Demolições",                 unit: "m³", source: "demolition_volume",  desc: "Demolição de parede" },
  construir: { capitulo: "Alvenarias",                 unit: "m²", source: "wall_area",          desc: "Construção de parede" },
  barrar:    { capitulo: "Preparação de superfícies",  unit: "m²", source: "wall_area",          desc: "Barramento" },
  pintar:    { capitulo: "Pinturas",                   unit: "m²", source: "wall_area",          desc: "Pintura" },
  revestir:  { capitulo: "Revestimentos",              unit: "m²", source: "wall_area",          desc: "Revestimento" },
};
```

UI do painel (3 estados conforme `budget_link_status`):
- `not_linked` / `suggested` → mostra "Sugestão: gerar item em **Pinturas** · 12,50 m²" + 3 botões: **Gerar item**, **Associar existente**, **Ignorar**.
- `linked` → mostra capítulo+artigo ligado, botão "Desassociar".
- `ignored` → mostra "Ignorado", botão "Reverter".

Ações:
- **Gerar item** → modal com capítulo (Select dos `capitulos_orcamento` do orçamento ativo da obra, ou criar novo), descrição editável, quantidade pré-preenchida, unidade fixa, preço unitário (consulta opcional a `base_precos_personalizada` por palavras-chave do material). Insere em `artigos_orcamento` e atualiza `plan_measurements.budget_artigo_id` + `budget_link_status='linked'`.
- **Associar existente** → reaproveitar `PlanMappingTable` simplificado (procura artigos do orçamento da obra).
- **Ignorar** → set `budget_link_status='ignored'`.

Para Construir, se houver `material_id`, sugerir preço/descrição a partir de `base_precos_personalizada` que tenha esse material.

Tudo client-side via `supabase` (sem edge function nesta fase) — respeita RLS já existente em `orcamentos` / `artigos_orcamento`.

## 4. Camada Axia – análise por regras

Novo hook `useAxiaPlanAnalysis(planId)` + componente `PlanMeasurementAxiaPanel.tsx` (no painel direito, abaixo do bloco de Orçamento).

Avaliação **client-side, por regras**, sem chamada a IA externa nesta fase (para já — fica preparado para um edge function `axia-plan-measurement-analyzer` futuro). Roda em cada save/update de medição e atualiza `axia_status` + `axia_notes` no próprio registo.

Regras (ordem de severidade):

| Condição | Status | Mensagem |
|---|---|---|
| `tipo='linha'` (segmento) sem `ceiling_height` | error · `missing_ceiling_height` | "Falta altura do pé direito — não consigo calcular a área da parede." |
| `action_type='demolir'` sem `wall_thickness_cm` | error · `missing_wall_thickness` | "Demolição sem espessura definida — volume não calculável." |
| `action_type='construir'` sem `material_id` e sem `material_label` | warning · `missing_material` | "Parede para construir sem material definido." |
| `wall_area > 100` e ação ∈ {pintar, barrar, revestir} | warning · `area_high` | "Área elevada — confirme a escala da planta." |
| `budget_link_status='not_linked'` (depois de medição válida) | info · `unlinked_to_budget` | "Esta medição ainda não está num orçamento." |
| Tudo ok | valid | "Medição completa e pronta para orçamento." |

Estrutura `axia_notes` (jsonb, array para suportar múltiplos avisos):
```json
[{ "severity":"warning","type":"missing_material",
   "message":"...","explanation":"...","suggested_action":"...","related_field":"material_id" }]
```

UI:
- Bloco "Análise Axia™" com badge colorido (verde/âmbar/vermelho) + lista de mensagens.
- Cada mensagem com botão "Corrigir" que dá foco ao campo (abre o `PlanSegmentDialog` em modo edição apontando ao `related_field`).
- Botão global "Reanalisar planta" no painel de medições, que percorre todas e atualiza `axia_status`.

Resumo agregado no topo do painel: "3 válidas · 2 avisos · 1 erro".

## 5. Edição pós-criação

Hoje o `PlanSegmentDialog` só abre na criação. Adicionar:
- Botão "Editar" em cada item da `PlanMeasurementsList` que tenha `action_type`.
- Reabrir `PlanSegmentDialog` em modo edição pré-preenchido (props: `initial?: SegmentSavePayload`), e em vez de inserir, atualizar via `updateMeasurement`.

## 6. Critérios de aceitação verificáveis

1. Toolbar mostra apenas "Navegar" e "Segmento".
2. Polígonos de ≥3 pontos guardam `baseboard_length` e mostram "Rodapé" no resumo (já feito).
3. Segmento (2 pontos) guarda 1 registo único com `action_type`, `wall_area`, e (consoante ação) `wall_thickness_cm`/`demolition_volume`/`material_id`.
4. Demolir bloqueia guardar sem espessura; Construir bloqueia sem material.
5. Cada medição com `action_type` mostra painel de Orçamento com 3 ações funcionais; ao gerar item, aparece em `artigos_orcamento` da obra e o estado passa a `linked`.
6. A Axia preenche `axia_status` e `axia_notes` automaticamente no save e no reanalisar; mensagens são contextuais (não genéricas).
7. RLS continua a isolar por organização (sem alterações às policies existentes — os campos novos herdam-nas).
8. Medições antigas (sem `action_type`) continuam visíveis e editáveis.

## 7. Ordem de implementação

1. Migração de `plan_measurements` (campos novos + índices).
2. Atualizar `types/plan-measurements.ts` e `usePlanMeasurements` para os novos campos.
3. Refatorar `handleConfirmSegment` para gravar registo único com metadados (e idem polígono).
4. Remover botão "Contagem" da `PlanWorkflowBar`.
5. Criar `lib/plan-budget-mapping.ts` + `PlanMeasurementBudgetPanel.tsx` e integrar no painel direito de `Detail.tsx`.
6. Criar `useAxiaPlanAnalysis` + `PlanMeasurementAxiaPanel.tsx`; rodar regras no save e botão "Reanalisar".
7. Modo edição do `PlanSegmentDialog`.
8. Smoke test: criar segmento → ver Axia → gerar item de orçamento → confirmar artigo na página de orçamento da obra.

## 8. O que NÃO vai mudar

- Schemas de `orcamentos`, `artigos_orcamento`, `materials` ficam intactos.
- `PlanMeasurementMapping` (tabela de mapping antiga) continua a existir para a página `Quantitativos` — o novo painel de Orçamento é caminho rápido por medição, mas não invalida o fluxo de Quantitativos.
- `PlanRooms`, `PlanWalls`, `PlanOpenings` continuam — só não são exposed na toolbar simples (ficam acessíveis via Axia/Symbol picker).
- Nenhuma alteração ao módulo de Plantas em produção que quebre medições antigas (campos novos são todos nullable com default).
