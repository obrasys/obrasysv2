# Leitura Inteligente de Plantas com Axia — Plano de Implementação

## Estado atual (verificado)

Já está em produção:
- Upload de planta (PDF/imagem), calibração 2-pontos, escala em px/m.
- Medição: segmento (2 cliques) e polígono fechado (3+ cliques) com Rodapé já calculado.
- Compartimentos (`plan_rooms`), paredes (`plan_walls`), vãos (`plan_openings`), elementos pontuais (`plan_placed_elements`).
- Ações construtivas por segmento: demolir / construir / barrar / pintar / revestir, com painel Orçamento e painel Axia (regras client-side) já implementados.
- Workflow stepper 4 passos: Calibrar → Medir → Axia → Orçamentar.

**Faltam, conforme briefing:**

1. **Pavimentos** (subsolo, térreo, piso 1…) — hoje a planta vive solta na obra, sem hierarquia de níveis.
2. **Páginas de PDF** ligadas a pavimento + calibração própria por página.
3. **Modo Guiado Axia** ON/OFF com mensagens passo-a-passo em linguagem simples.
4. **Confiança** por item (Confirmado / Provável / Precisa validar / Informação em falta) — hoje só temos `pendente/validado/rejeitado`.
5. **Escadas** estruturadas (degraus, espelhos, patamares, corrimão).
6. **Símbolos de especialidades** quantificados (elétrica, hidráulica, incêndio).
7. **Itens "Outros"** invisíveis em planta (demolições, andaimes, licenças, limpeza…).
8. **Quadro Quantitativo unificado** por pavimento/compartimento/categoria com origem da medição e ação sugerida.
9. **Envio para Orçamento em lote** com pré-visualização e vínculo persistente medição ↔ artigo.

---

## Princípios de segurança (não-negociáveis)

- Nada existente é apagado ou renomeado: `plan_imports`, `plan_calibrations`, `plan_measurements`, `plan_rooms`, `plan_walls`, `plan_openings`, `plan_placed_elements` ficam como estão.
- Tabelas novas adicionadas; FKs novas são nullable; medições antigas continuam visíveis e editáveis.
- Fallback automático: planta sem pavimento ⇒ pavimento "Não definido" criado on-the-fly por obra; planta sem calibração de página ⇒ usa a calibração existente do `plan_import` (já no `plan_calibrations`).
- RLS herda o padrão atual (`get_org_member_ids()`).
- Toggle "Modo Guiado Axia" guardado em `user_settings` ou local; OFF restaura a UI atual (com calibração ainda recomendada).

---

## Fase 1 — Pavimentos, páginas e Modo Guiado

### 1.1 Modelo de dados (migrações novas, aditivas)

```sql
-- Pavimentos por obra
create table public.plan_floors (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  type text not null default 'piso'
    check (type in ('subsolo','terreo','piso','cobertura','mezanino','outro')),
  order_index int not null default 0,
  default_ceiling_height numeric(6,2) not null default 2.70,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Páginas de planta (1:N por plan_import)
create table public.plan_pages (
  id uuid primary key default gen_random_uuid(),
  plan_import_id uuid not null references public.plan_imports(id) on delete cascade,
  page_number int not null default 1,
  floor_id uuid references public.plan_floors(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (plan_import_id, page_number)
);

-- Ligar calibração e medições a uma página específica (nullable p/ retro-compat)
alter table public.plan_calibrations  add column page_id uuid references public.plan_pages(id) on delete cascade;
alter table public.plan_measurements  add column page_id uuid references public.plan_pages(id) on delete set null,
                                      add column floor_id uuid references public.plan_floors(id) on delete set null,
                                      add column room_id uuid references public.plan_rooms(id) on delete set null,
                                      add column confidence text not null default 'provavel'
                                        check (confidence in ('confirmado','provavel','precisa_validar','informacao_em_falta')),
                                      add column measurement_origin text not null default 'manual'
                                        check (measurement_origin in ('axia_auto','manual','derivado','outros','simbolo','editado'));
alter table public.plan_rooms         add column page_id uuid references public.plan_pages(id) on delete set null,
                                      add column floor_id uuid references public.plan_floors(id) on delete set null,
                                      add column confidence text not null default 'provavel';
```

Trigger backfill: ao abrir um `plan_import` sem `plan_pages`, criar 1 página default ligada à página 1 do PDF (ou única para imagem). Idem para `plan_floors`: ao abrir uma obra sem floors, oferecer criar "Térreo" automaticamente — sem inserir em silêncio.

RLS: políticas iguais às tabelas-pai (via `get_org_member_ids()`).

### 1.2 UI — Sidebar de Pavimentos no Detail da planta

- Painel esquerdo novo `PlanFloorsSidebar.tsx`: lista de pavimentos da obra com badges (n.º compartimentos / m² / quantitativos).
- Botões: criar / editar / reordenar / eliminar pavimento (drag para reordenar).
- Selecionar pavimento filtra: páginas visíveis, medições, compartimentos, e o quadro quantitativo.

### 1.3 UI — Páginas e calibração por página

- No `Detail.tsx`, substituir o controlo `currentPage` simples por uma `PlanPagesBar.tsx`:
  - thumbnails das páginas (PDF) com badge "Calibrada" / "Pavimento: Térreo".
  - botão "Atribuir pavimento" e "Reutilizar calibração de outra página" (com aviso).
- `usePlanCalibration` passa a aceitar `pageId`. Compatibilidade: se um plan_import só tem 1 página e a calibração antiga está em `plan_calibrations` sem `page_id`, ela é tratada como página default.

### 1.4 Modo Guiado Axia

- Novo componente `PlanGuideAxia.tsx` (overlay flutuante canto inferior-direito, dispensável).
- Estado `guideEnabled` em `usePreferences()` (já existe `PreferencesContext`) — chave `plan_guide_enabled`, default `true`.
- Sequência de mensagens contextuais (uma por vez, com botões "Já fiz" / "Saltar"):
  1. "Carregue uma planta ou selecione uma página."
  2. "Vamos calibrar a escala. Selecione 2 pontos com distância conhecida."
  3. "Confirme o pavimento desta planta."
  4. "Confirme o pé-direito padrão deste pavimento."
  5. "Identifiquei N compartimentos. Está correto?"
  6. "Encontrei N portas e N janelas. Quer validar?"
  7. "Estes quantitativos estão prontos para enviar ao orçamento."
- Toggle visível em `PlanWorkflowBar.tsx`: **"Desativar condução da Axia"** (Switch). Quando OFF, o overlay esconde-se mas calibração continua acessível e recomendada.

### 1.5 Confiança por item

- Helper `src/lib/plan-confidence.ts` mapeia automaticamente:
  - validado pelo user ⇒ `confirmado`
  - criado por IA com score ≥ 0.8 ⇒ `provavel`
  - score < 0.8 ⇒ `precisa_validar`
  - falta `ceiling_height` / `wall_thickness_cm` quando aplicável ⇒ `informacao_em_falta`
- Badges visuais (verde / amarelo / laranja / vermelho) em `PlanMeasurementsList`, `PlanRoomsList` e no Quadro Quantitativo.
- Regra de envio: itens `informacao_em_falta` bloqueados no envio para orçamento.

---

## Fase 2 — Quadro Quantitativo unificado

### 2.1 View materializada (sem nova tabela)

Em vez de duplicar dados, criar **view** `plan_quantitativos_v` que agrega o que já existe:

```sql
create or replace view public.plan_quantitativos_v as
  -- Linha por medição com action_type: parede/pintura/etc
  select m.id, m.plan_import_id, m.page_id, m.floor_id, m.room_id, m.user_id,
         coalesce(m.action_type, 'medicao') as categoria,
         m.etiqueta as elemento, m.unidade,
         coalesce(m.valor_final, m.valor_ajustado, m.valor_bruto) as quantidade,
         m.confidence, m.measurement_origin, m.observacao,
         m.budget_link_status, m.budget_artigo_id, 'measurement' as fonte
    from public.plan_measurements m
  union all
  -- Linha por compartimento: piso, teto, rodapé
  select r.id || ':piso', r.plan_import_id, r.page_id, r.floor_id, r.id as room_id, r.user_id,
         'piso' as categoria, r.nome as elemento, 'm²' as unidade,
         r.area_m2 as quantidade, r.confidence,
         'derivado' as measurement_origin, null as observacao,
         'not_linked', null, 'room_floor' as fonte
    from public.plan_rooms r
  union all  -- igual para teto, rodapé
  ...;
```

(View em vez de tabela: zero risco de divergência; refresh é automático.)

### 2.2 Componente `PlanQuantityTable.tsx`

Nova tab "Quadro Quantitativo" no `Detail.tsx` (substitui parcialmente a `PlanQuantitativosByRoom` existente, que continua disponível).

Colunas: Pavimento · Compartimento · Categoria · Elemento · Unidade · Quantidade · Confiança · Origem · Observações · Ação.

Filtros (toolbar): pavimento, compartimento, categoria, confiança, origem, status de envio.

Ações inline por linha:
- editar quantidade / unidade / categoria
- alterar confiança
- confirmar item (passa a `confirmado`)
- excluir
- adicionar observação
- enviar este item para orçamento

Ação em massa:
- selecionar tudo / por filtro
- "Enviar selecionados para orçamento"

---

## Fase 3 — Escadas, Especialidades e "Outros"

### 3.1 Escadas

```sql
create table public.plan_stairs (
  id uuid primary key default gen_random_uuid(),
  plan_import_id uuid not null references public.plan_imports(id) on delete cascade,
  page_id uuid references public.plan_pages(id) on delete set null,
  origin_floor_id uuid references public.plan_floors(id) on delete set null,
  destination_floor_id uuid references public.plan_floors(id) on delete set null,
  user_id uuid not null,
  largura_m numeric(6,2) not null default 1.00,
  steps_count int not null default 0,
  risers_count int not null default 0,
  tread_depth_m numeric(6,3) not null default 0.28,
  riser_height_m numeric(6,3) not null default 0.18,
  landings jsonb not null default '[]'::jsonb,  -- [{ largura, comprimento }]
  has_handrail boolean not null default true,
  has_guardrail boolean not null default false,
  handrail_length_m numeric(6,2),
  guardrail_length_m numeric(6,2),
  confidence text not null default 'provavel',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Componente `PlanStairsForm.tsx` com cálculos automáticos (área pisos = steps × largura × tread; área espelhos = risers × largura × riser; área patamares; comprimento total de corrimão e guarda-corpo). Cada cálculo gera linha no Quadro Quantitativo via view.

### 3.2 Símbolos de especialidades

Já existe `plan_placed_elements` + `plant_symbols`. Acrescentar mapeamento:
- novo helper `src/lib/plan-symbol-budget-mapping.ts`: símbolo → categoria de orçamento + unidade default.
- Quadro Quantitativo agrega contagens por tipo de símbolo e pavimento.
- `PlanWorkflowBar.tsx` ganha toggle de filtro de especialidade (Elétrica / Canalização / Incêndio / AVAC / Telecom).

### 3.3 Itens "Outros"

```sql
create table public.plan_additional_items (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  floor_id uuid references public.plan_floors(id) on delete set null,
  room_id uuid references public.plan_rooms(id) on delete set null,
  user_id uuid not null,
  description text not null,
  category text,
  unit text not null default 'un',
  quantity numeric(14,4) not null default 1,
  notes text,
  budget_link_status text not null default 'not_linked',
  budget_artigo_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Componente `PlanOthersTab.tsx` com presets (demolições, andaimes, transporte, licenças, limpeza, impermeabilizações, ligações técnicas, trabalhos especiais). Aparece no Quadro Quantitativo com origem `outros`.

---

## Fase 4 — Envio para Orçamento integrado

### 4.1 Diálogo de pré-visualização

Novo `PlanBudgetSendDialog.tsx`:
1. lista os itens selecionados agrupados por capítulo sugerido
2. permite escolher orçamento de destino (Select dos `orcamentos` da obra) ou criar novo
3. permite alterar capítulo e descrição por linha
4. valida: unidade não vazia, quantidade > 0, sem `informacao_em_falta`
5. botão "Confirmar envio"

Inserção via Supabase client (RLS protege):
- por linha cria `artigos_orcamento` (sem `valor_total` — trigger trata, conforme regra registada na memória)
- atualiza `plan_measurements.budget_artigo_id` + `budget_link_status='linked'`
- guarda `plan_budget_links` (já existe) para histórico

### 4.2 Vínculo persistente

Cada artigo criado guarda em `observacao` ou metadata o `plan_import_id` + `plan_floor_id` + `plan_measurement_id`, para que o orçamento mostre badge "Origem: Planta · Térreo · Sala" e permita "Voltar à planta".

### 4.3 Reverter

- Em cada artigo originado de planta, o utilizador pode "Desligar da planta" (não apaga o artigo, apenas remove o vínculo).
- Em cada item da planta, "Desassociar" volta o estado a `not_linked`.

---

## Fase 5 — Detalhes técnicos e novos hooks

Hooks novos:
- `usePlanFloors(obraId)`
- `usePlanPages(planImportId)`
- `usePlanQuantitativos(planImportId, filters)`
- `usePlanStairs(planImportId)`
- `usePlanAdditionalItems(obraId)`
- `useGuidedAxia()` — gerencia a sequência de passos do modo guiado

Funções utilitárias em `src/lib/plan-calculations.ts` (consolidando o que já existe disperso):
- `calculateStairTreadArea`, `calculateStairRiserArea`, `calculateLandingArea`
- `calculateFacadeArea(perimeter, height, openings, platibanda)`
- `calculateBaseboardLength(roomPolygon, openings, rule)` com regras configuráveis
- `mapPlanElementToBudgetItem(element)`
- `validateQuantitiesBeforeBudgetSend(items)`

---

## Fase 6 — Validações e fallbacks

Antes de gerar quantitativos:
- planta carregada? página atribuída a pavimento? calibração ativa? pé-direito definido quando necessário? polígonos têm ≥3 pontos? escadas têm dimensões mínimas? itens com baixa confiança sinalizados?

Antes do envio para orçamento (na lib `validateQuantitiesBeforeBudgetSend`):
- existe orçamento na obra?
- todas as linhas têm unidade e quantidade > 0?
- nenhuma linha em `informacao_em_falta`?
- utilizador confirmou explicitamente?

Fallback retro-compat:
- plantas antigas sem pavimento: criar pavimento "Não definido" (type `outro`, ordem 999) e pedir validação no overlay Axia.
- plantas sem calibração de página: continuam a usar a calibração antiga; não bloqueia visualização, bloqueia apenas geração de novos quantitativos automáticos (manuais continuam permitidos).

---

## Critérios de aceitação verificáveis

1. Posso criar pavimentos (subsolo, térreo, piso 1, cobertura, mezanino, personalizado) numa obra.
2. Cada página de uma planta PDF pode ser atribuída a um pavimento e ter calibração própria.
3. Modo Guiado Axia aparece por defeito, conduz passo-a-passo, e pode ser desligado sem partir nada.
4. Cada medição/compartimento tem badge de confiança visível.
5. Quadro Quantitativo agrega tudo (medições, compartimentos, escadas, símbolos, "Outros") com filtros.
6. Linhas com "Informação em falta" não enviam para orçamento.
7. Envio em lote cria artigos de orçamento e mantém vínculo bidirecional planta ↔ artigo.
8. Plantas antigas continuam abrir e editar sem erros; nenhuma medição é apagada.
9. Linter sem erros novos; build verde; RLS isola por organização.

---

## O que NÃO muda

- Nenhum schema existente é renomeado ou tem coluna apagada (só `add column nullable`).
- `PlanWorkflowBar`, `PlanCalibrationTool`, `PlanSegmentDialog`, `PlanMeasurementsList`, `PlanQuantitativosByRoom`, `PlanBudgetGenerator` continuam a funcionar (ganham, no máximo, props opcionais).
- Rotas atuais (`/obras/:id/plantas`, `/obras/:id/plantas/:planId`) intactas.
- Módulos Orçamentos, Obras, Documentos, Axia chat, RDOs ficam isolados.

---

## Ordem sugerida de implementação

1. **Fase 1** (pavimentos + páginas + Modo Guiado + confiança) — desbloqueia tudo o resto.
2. **Fase 2** (Quadro Quantitativo via view) — entrega visível.
3. **Fase 3** (Escadas + Símbolos como categorias + "Outros").
4. **Fase 4** (envio em lote para orçamento + vínculo bidirecional).
5. Testes manuais com uma planta antiga (sem pavimento, sem calibração nova) e uma planta nova.

Cada fase é independentemente entregável e testável; podemos parar em qualquer ponto sem deixar o módulo num estado inconsistente.