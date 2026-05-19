
# Plano — Estabilização do Módulo Planta / Leitura de Planta

Objetivo: corrigir a cadeia **Planta → Axia → Compartimentos → Quantitativos → Mapeamento → Orçamento**, sem reescrever o módulo nem quebrar dados existentes. Trabalho dividido em 5 fases incrementais, cada uma entregável e testável de forma independente.

---

## Fase 1 — Estabilizar análise e reanálise (Axia + persistência)

**Edge function `axia-plan-vision` + hook `usePlanAxiaPersistence`**

- Introduzir estado explícito da análise: `pending | processing | completed | failed` + `error_message` técnico + `revision_number`.
- Reanálise nunca apaga a análise anterior:
  - Criar nova linha (revisão) e só promover a "ativa" se `completed`.
  - Se falhar, manter a revisão anterior como ativa e devolver mensagem amigável.
- Cadeia de fallback no edge function:
  1. Análise completa (compartimentos + elementos + medições).
  2. Se falhar, leitura simplificada (só compartimentos com área/perímetro).
  3. Se falhar, leitura mínima (áreas/perímetros sem classificação).
  4. `confidence < 0.6` → `review_required = true`.
- Toast amigável no frontend + botão "Tentar novamente" sempre disponível.

**Entrega:** reanalisar uma planta nunca deixa o módulo num estado quebrado.

---

## Fase 2 — Associação Compartimento ↔ Medição (núcleo do problema)

**Novo módulo `src/lib/plan-compartment-association.ts`**

- Função `associateMeasurementsToCompartments(measurements, compartments)`:
  1. Match por `compartment_id` explícito.
  2. Match por nome no `etiqueta`/`description` (ex: "Rodapé — SALA").
  3. Match geométrico: ponto/polígono da medição dentro do polígono do compartimento (point-in-polygon).
  4. Match por proximidade espacial (centróide mais próximo).
- **Deduplicação de nomes**: se existirem N compartimentos com o mesmo nome normalizado (`QUARTO`), renomear para `QUARTO 1`, `QUARTO 2`, `QUARTO 3` (display_name) mantendo `normalized_name` original.
- Cálculo de derivados por compartimento quando faltam medições:
  - `pavimento_m2 = area_m2`
  - `teto_m2 = area_m2`
  - `rodape_ml = perimetro_m - Σ largura_portas`
  - `paredes_m2 = perimetro_m × pe_direito - Σ vãos`
  - Premissas padrão configuráveis: `pe_direito=2.60`, `porta=0.80×2.00`. Marcar como `estimado=true`.
- Nunca exibir `0,00 m²` quando o compartimento tem perímetro válido.

**Migração DB:** adicionar `compartment_id` nullable em `plan_measurements` (se ainda não existir) + índice.

**UI:** corrigir `PlanQuantitativosByCompartment` para usar a nova função antes de cair em "Sem compartimento".

---

## Fase 3 — Mapeamento inteligente + sugestão de artigo

**Hook `usePlanMappings` + `src/lib/plan-base-precos-matching.ts`**

- Reforçar matching automático com sinais combinados: tipo de medição + camada + unidade + nome compartimento + descrição.
- Sugestões contextuais (top 5) por linha na aba Mapeamento (já existe parcialmente — completar para rodapé/paredes/teto/pavimento).
- **Mapeamento em massa**: botão "Aplicar a todos do mesmo tipo" + checkboxes por linha + ação em lote.
- Quando não há artigo compatível:
  - Modal "Criar artigo sugerido pela Axia" (edge function `axia-plan-suggestions` já existe — estender prompt).
  - Resultado: artigo com `status='suggested'`, sem preço obrigatório, marcado `review_required`.
  - Ações: aceitar, editar, guardar na base, usar só neste orçamento, ignorar.

---

## Fase 4 — Perguntas de acabamento (Axia operacional)

**Novo componente `src/components/plantas/FinishingChoicesStep.tsx`**

- Step opcional antes do envio para orçamento.
- Perguntas por tipo (Paredes / Rodapé / Pavimento / Teto / Portas / Janelas) com presets + "Definir depois".
- Cada resposta resolve para um artigo da base ou cria sugestão.
- Não bloqueia o fluxo; itens sem definição vão para orçamento com tag `pendente_definicao`.

---

## Fase 5 — Envio para Orçamento (novo ou existente)

**Modal `SendToBudgetModal` + hook novo `useCreateBudgetFromPlan`**

- Se existir orçamento na obra: dropdown + botão secundário "Criar novo orçamento".
- Se não existir: CTA "Criar novo orçamento com estes quantitativos" + Cancelar.
- Criação automática:
  - Nome: `Orçamento gerado da planta — {nome_planta} (Rev. X)`.
  - Reutilizar `generate_orcamento_codigo`.
  - Organização escolhida: por compartimento / por tipo / por camada / por pavimento / capítulo único.
  - Persistir rastreabilidade nos artigos: `plant_id`, `analysis_id`, `revision_id`, `measurement_id`, `compartment_id` (colunas novas em `artigos_orcamento`, nullable).
- Redireciona para `/orcamentos/{id}/ver` após sucesso.

---

## Detalhes técnicos

**Migrações DB necessárias**
- `plan_measurements`: adicionar `compartment_id uuid`, `mapping_status text`, `validation_status text` (se não existirem).
- `plan_rooms`: adicionar `display_name text`, `normalized_name text`, `revision_number int`.
- `plan_analyses` (nova ou estender existente): `status`, `error_message`, `revision_number`, `is_active`.
- `artigos_orcamento`: colunas opcionais de rastreabilidade (`source_plant_id`, `source_measurement_id`, `source_compartment_id`).
- Todas com RLS já cobertas pelos policies da obra/organização.

**Edge functions tocadas**
- `axia-plan-vision`: status + fallback chain + retornar `compartment_id` por medição.
- `axia-plan-suggestions`: estender para gerar artigos sugeridos completos (descrição + capítulo + unidade).

**Frontend tocado**
- `src/components/plantas/PlanAIAnalysis.tsx` — usa nova lógica de associação ao normalizar.
- `src/components/plantas/PlanQuantitativosByCompartment.tsx` (novo ou refactor) — vista corrigida.
- `src/components/plantas/PlanMappingTable.tsx` — bulk mapping + sugestão de artigo.
- `src/components/plantas/SendToBudgetModal.tsx` — criação automática.
- `src/lib/plan-compartment-association.ts` (novo).

**Logs técnicos**
- Console + tabela `plan_audit_log` (opcional, leve) com eventos: `analysis_started`, `analysis_failed`, `compartment_associated`, `mapping_auto`, `budget_created_from_plan`.

---

## Sequência de entrega proposta

1. **Fase 1** (1 turno) — estabilização análise/reanálise.
2. **Fase 2** (1 turno) — associação compartimento↔medição + derivados.
3. **Fase 3** (1 turno) — mapeamento massa + sugestão.
4. **Fase 4** (1 turno) — perguntas acabamento.
5. **Fase 5** (1 turno) — envio/criação de orçamento.

Cada fase fecha com testes manuais no preview e migração isolada.

---

**Pergunta antes de começar:** Aprovas começar já pela **Fase 1 + Fase 2** (que resolvem ~70% das queixas: reanálise quebrada e quantitativos em "Sem compartimento") num único turno, e seguir depois para 3→5? Ou preferes outra ordem (p.ex. começar pelo envio para orçamento da Fase 5)?
