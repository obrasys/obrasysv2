# Plano — Planta/ICF multi-folha com sugestão de fundação ICF

Já existe a base (migração de `plan_pages`, `plan_measurements` com colunas de origem, `plan_foundation_suggestions`, edge functions `axia-classify-sheets` e `axia-foundation-suggestion`, hooks e componentes `SheetsIdentifiedPanel`, `StructureFoundationTab`, `FoundationSuggestionWizard`). Este plano completa as lacunas e alinha o comportamento com as regras detalhadas que descreveste.

## 1. Classificação das folhas (Etapa 1)

**Backend — `axia-classify-sheets`**
- Reescrever prompt Gemini 2.5 Pro com a tabela completa de palavras-chave PT (arquitetura, estrutura, alçados, cortes, ICF, metálicos).
- Devolver, por folha: `page_number`, `sheet_title`, `drawing_code`, `discipline`, `sheet_type` (15 tipos: floor_plan, roof_plan, elevation, section, foundation_plan, structural_floor_plan, reinforcement_detail, wall_reinforcement, beam_reinforcement, slab_reinforcement, metallic_structure_detail, icf_detail, unknown…), `detected_floor`, `should_extract_quantities`, `use_for_validation_only`, `confidence_score`, `warnings[]`.
- Aplicar regras determinísticas após Gemini (override por regex) para garantir as combinações exatas pedidas (R/C → architecture+floor_plan+R/C; Pormenores ICF → use_for_validation_only=true; Alçado/Corte → architecture+validation_only; etc.).
- Persistir em `plan_pages`, devolver miniatura (já gerada por `pdf-to-image`).

**Frontend — `SheetsIdentifiedPanel`**
- Lista com miniatura, página, nome, código, badge de disciplina, tipo, piso, barra de confiança, warnings.
- Selector inline para editar disciplina, tipo, piso, e três toggles: usar para quantitativos / usar só para validação / ignorar.
- Botão "Reclassificar com Axia" e "Confirmar classificação e continuar".

## 2. Extração de quantitativos (Etapa 2)

**Backend — `axia-analysis`**
- Aceitar `sheet_classification` como input; iterar apenas folhas com `should_extract_quantities=true`.
- Para cada item extraído, preencher obrigatoriamente: `capitulo`, `artigo`, `descricao`, `unidade`, `quantidade`, `piso_origem`, `compartimento_origem`, `folha_origem`, `pagina_origem`, `disciplina_origem`, `tipo_folha_origem`, `metodo_calculo`, `estado_quantitativo`, `confidence_score`, `requer_validacao_tecnica`, `observacoes`.
- Regra de anti-duplicação (`src/lib/plan-dedupe.ts` estendido):
  - Para o mesmo piso, se houver folha estrutural, suprimir paredes/lajes/pilares vindos da arquitetura.
  - Cortes e alçados → só validação, nunca quantitativo principal.
  - Pormenores ICF/metálicos → validação de composição, não área.

**Frontend — `Quantitativos`**
- Agrupamento obrigatório no mapa:
  - Arquitetura — R/C, 1.º Piso, Cobertura, Fachadas/Exterior
  - Estrutura — Fundação, Piso 0, Piso 1, Armaduras, Perfis metálicos
  - Fundação sugerida (separador distinto)
- Filtros laterais: piso, disciplina, folha, estado, confiança, "requer validação".
- Badge por linha com `estado_quantitativo` (confirmado por estrutura / sugestão / extraído arquitetura / manual).

## 3. Sugestão de fundação ICF (Etapa 3)

**Trigger**
- Em `StructureFoundationTab`, se `plan_pages` não contiver nenhuma `discipline='structure'`, mostrar mensagem oficial e 3 botões: gerar sugestão / carregar estrutura / ignorar.

**Wizard** (`FoundationSuggestionWizard` estendido para 12 perguntas)
- Pisos, cave, garagem, terreno, ICF integral, muros contenção, grandes vãos, tipo laje térrea, altura média pisos, localização, desníveis, estudo geotécnico.

**Backend — `axia-foundation-suggestion`**
- Calcula a partir da arquitetura: perímetro R/C, área implantação, alinhamentos verticais (R/C ↔ pisos), grandes vãos, presença garagem.
- Devolve itens preliminares:
  - Betão de limpeza, Fundação contínua exterior, Fundação contínua interior estrutural, Sapatas isoladas, Vigas/lintéis de fundação, Laje térrea ICF ou massame, Impermeabilização periférica, Drenagem periférica, Arranques/esperas.
- Cada item: `estado_quantitativo='sugestao_preliminar'`, `confidence_score` baixa/média, `requer_validacao_tecnica=true`, `disciplina_origem='architecture'`, `tipo_folha_origem='floor_plan'`, observação obrigatória "Sugestão... Requer validação por projeto de estabilidade."
- Persistir em `plan_foundation_suggestions` + injetar como linhas em `plan_additional_items` com flag `estado_quantitativo='sugestao_preliminar'`.

## 4. Alertas e validações

Componente `PlanAlertsPanel` no topo do Detail:
- Sem folhas de estrutura
- Estrutura sem planta de fundações
- Diferença de pisos entre arquitetura/estrutura
- Quantitativos com baixa confiança
- Possível duplicação detetada
- Sugestão de fundação ativa sem geotécnico
- Mensagens oficiais "Projeto estrutural identificado..." / "Projeto estrutural não encontrado..."

## 5. Resumo final e envio para orçamento

Card "Resumo do projeto" no fim:
- Total de folhas, n.º arquitetura, n.º estrutura, pisos, flags (fundação? estrutural piso 0? piso 1? armaduras? metálicos?), se houve sugestão de fundação, nível geral de confiança.
- Botão "Validar e enviar para orçamento" — usa `useCanSendPlanToBudget` (já bloqueia se houver linhas `requer_validacao_tecnica=true` por confirmar).

## 6. Anti-duplicação (regras técnicas)

`src/lib/plan-dedupe.ts`:
```
dedupeAcrossDisciplines(items):
  for each (piso, elemento_tipo):
    if existe item structure → manter structure, descartar architecture
  for cortes/alçados: estado_quantitativo='validacao_apenas', excluir do mapa principal
  para pormenores ICF/metálicos: apenas para enriquecer composição
```

## 7. Detalhes técnicos

- Tipos: estender `src/types/plan-measurements.ts` com novos enums (`SheetType`, `DisciplineType`, `EstadoQuantitativo`).
- Hooks: estender `usePlanQuantitativos` com `groupByDisciplinaPisoFolha()`.
- Migração mínima adicional: adicionar colunas em falta (`metodo_calculo`, `tipo_folha_origem`, `compartimento_origem`) se ainda não existirem em `plan_measurements`/`plan_additional_items`.
- RLS: todas as tabelas já têm policies org-scoped, mantém-se.
- Testes: estender `icf-foundation-suggestions.test.ts` com cenários (cave, garagem, ICF integral, grandes vãos).

## 8. Ficheiros tocados (resumo)

- `supabase/migrations/<nova>.sql` (colunas em falta, se aplicável)
- `supabase/functions/axia-classify-sheets/index.ts` (prompt + override regex)
- `supabase/functions/axia-analysis/index.ts` (origem obrigatória + dedupe)
- `supabase/functions/axia-foundation-suggestion/index.ts` (12 inputs + 9 itens)
- `src/lib/plan-sheet-classification.ts` (override determinístico)
- `src/lib/plan-dedupe.ts` (cross-disciplina)
- `src/types/plan-measurements.ts` (enums)
- `src/hooks/usePlanQuantitativos.ts` (agrupamento)
- `src/hooks/useSheetClassification.ts`, `useFoundationSuggestion.ts` (estender)
- `src/components/plantas/SheetsIdentifiedPanel.tsx` (editor inline)
- `src/components/plantas/StructureFoundationTab.tsx` (estados A/B)
- `src/components/plantas/FoundationSuggestionWizard.tsx` (12 perguntas)
- `src/components/plantas/PlanAlertsPanel.tsx` (novo)
- `src/components/plantas/PlanSummaryCard.tsx` (novo)
- `src/pages/plantas/Detail.tsx` e `Quantitativos.tsx` (integração + filtros)
- `src/lib/icf-foundation-suggestions.test.ts` (novos cenários)

## Notas

- Toda a sugestão de fundação fica visualmente distinta com badge "Preliminar — Requer validação técnica" e nunca passa o gate de envio para orçamento sem confirmação explícita do utilizador.
- O fluxo respeita: classificar → confirmar → extrair → validar/sugerir → enviar para orçamento.
