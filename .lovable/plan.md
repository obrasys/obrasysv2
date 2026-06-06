
# Evolução do módulo Planta/ICF — leitura PDF + DXF com quantitativos revisíveis

Vou abordar isto em **13 fases sequenciais**, começando por estabilizar o PDF antes de adicionar DXF. Cada fase é entregue, testada e validada antes de avançar — nada vai para produção sem revisão humana dos quantitativos.

---

## Fase 1 — Auditoria técnica do fluxo PDF atual (read-only)

Antes de tocar em código, faço um relatório técnico interno cobrindo:

- **Frontend**: `PlanUploadForm`, `usePlanImports`, página `plantas/Index.tsx` e `plantas/Quantitativos.tsx` — validações, MIME types, limites, mensagens de erro.
- **Storage**: bucket `plan-files`, políticas, paths, URLs assinadas (`useSignedUrl`).
- **Hooks de leitura**: `useIcfPlantAnalysis`, `usePlanAxiaPersistence`, `usePlanMeasurements`, `usePlanRooms`, `usePlanWalls`, `usePlanOpenings`, `usePlanPlacedElements`, `usePlanQuantitativos` e view `plan_quantitativos_v`.
- **Edge functions**: `icf-plant-analysis`, `icf-complete-project-analyzer`, `icf-architecture-assistant`, `axia-plan-suggestions`, `axia-infra-scenarios` — chain de modelos, timeouts, tratamento PDF vs imagem, persistência.
- **Lib**: `pdf-to-image.ts`, `plan-quantitativos-engine.ts`, `plan-discipline.ts`, `plan-budget-mapping.ts`, regras Axia.
- **DB**: tabelas `plan_imports`, `plan_pages`, `plan_floors`, `plan_walls`, `plan_openings`, `plan_rooms`, `plan_measurements`, `plan_placed_elements`, `icf_assistant_sessions/items`, RLS e GRANTs.
- **Casos-limite**: PDF sem escala, PDF rasterizado, PDF multi-página, ficheiros > 12 MB, modelos que rejeitam PDF (já corrigido recentemente para Gemini).

**Entregável**: documento `.lovable/audit-planta-icf.md` com problemas encontrados, severidade e correções propostas. Sem alterações de código nesta fase.

---

## Fase 2 — Estabilização e melhoria da leitura PDF

Corrijo os bugs da Fase 1 e reforço o pipeline PDF existente:

- Forçar Gemini para PDFs (já feito) e adicionar pré-rasterização opcional via `renderPdfFirstPageToPngBlob` quando o PDF é grande.
- Garantir extração de: escala, piso, compartimentos, áreas, paredes ext/int, espessuras, vãos, perímetros, ml de parede, pé-direito assumido, áreas bruta/aberturas/líquida, observações, **confidence_score por item**.
- Quando faltar info: novo modal "**Dados em falta**" perguntando escala, pé-direito, ICF ext/int, espessura bloco, descontar vãos, fundações, tipo de folha.
- Painel de revisão antes de fechar quantitativo (reusar e melhorar componentes existentes).
- Mensagens de erro humanas (catálogo unificado, Fase 11).

---

## Fase 3 — Aceitar upload DXF (frontend) ✅

- ✅ `PlanUploadForm`: `useDropzone` aceita `.dxf` (MIMEs `application/dxf`, `application/x-dxf`, `image/vnd.dxf`, `application/octet-stream` + fallback por extensão). Limite 20 MB para DXF, 12 MB para raster. Ícone `FileCode` + badge "DXF vetorial".
- ✅ Texto da dropzone: "PDF, DXF, PNG ou JPG — até 12 MB (raster) / 20 MB (DXF vetorial)".
- ✅ `usePlanImports`: deteta `dxf` por extensão, faz upload com `contentType: application/dxf`, persiste `file_type='dxf'`.
- ⏭️ Migração de `plan_imports.file_type`: não necessária (coluna é `TEXT` sem CHECK).
- ⏭️ Routing real para o pipeline DXF é entregue na **Fase 4** (`plan-dxf-parse`). Por agora a planta entra na lista mas o painel de análise IA não a usa.

---

## Fase 4 — Pipeline técnico DXF (vetorial, sem IA visual) ✅

Nova edge function `plan-dxf-parse` (Deno + `npm:dxf-parser@1.1.2`):

- ✅ Auth + validação de organização + anti-IDOR sobre `file_path` (mesma política do `icf-plant-analysis`).
- ✅ Lê entidades LINE / LWPOLYLINE / POLYLINE / INSERT, classifica por layer (whitelist regex: paredes/portas/janelas/fundações/lajes/estrutura/cotas).
- ✅ Unidade inferida via `$INSUNITS` (in/mm/cm/dm/m). Quando ausente → assume mm e marca `unidade_assumida=true` + confiança 0.45.
- ✅ Heurística de paredes: emparelhamento de linhas paralelas dentro de 0.05–0.60 m → eixo único, espessura medida; linhas sem par → confiança 0.45 + `metodo_medicao='estimativa_visual'`.
- ✅ Vãos (portas/janelas) por layer ou bloco INSERT, distribuídos round-robin pelos panos para revisão humana.
- ✅ Output igual ao `icf-plant-analysis` (`paredes/fundacoes/lajes/notas/totais/validacao`) → `useIcfPlantAnalysis` consome sem alterações no painel ICF.
- ✅ Snapshot em `plan_analysis_versions` com `source='plan-dxf-parse'`, `requires_review=true` sempre.
- ✅ Eventos em `plan_analysis_logs` (`analise_iniciada`, `analise_concluida_com_revisao`, `erro`).
- ✅ Routing no frontend: `useIcfPlantAnalysis` deteta `.dxf` no `file_path` e invoca `plan-dxf-parse`; `IcfPlantAnalyzer` aceita `.dxf` no `accept` do input.
- ⏭️ Layers ambíguos via IA textual (Gemini Flash) e fundações/lajes via parser ficam para iteração futura.

---

## Fase 5 — Normalização de unidades e escala DXF ✅

- ✅ Inferência de unidade via `$INSUNITS` (in/mm/cm/dm/m); quando ausente, assumir mm e marcar `unidade_assumida=true`.
- ✅ `plan-dxf-parse` aceita `unit_override` (`mm|cm|m|in|dm`) — sobrepõe-se ao header e marca `unidade_dxf` com sufixo "(confirmado pelo utilizador)".
- ✅ Sanity checks no audit (`validacao.sanity_warnings[]`): bbox < 1 m, bbox > 500 m, parede > 100 m, comprimento total > 5000 m. `bbox_m` (width/height/diagonal) exposto em `totais` + `validacao`.
- ✅ `requires_unit_confirmation` devolvido sempre que a unidade foi assumida ou há sanity warning de escala sem override aplicado.
- ✅ Novo `DxfUnitConfirmDialog` (mm/cm/m/in/dm) com bounding box atual + lista de warnings. Confirmação reinvoca a análise com `unit_override`; cancelar descarta o resultado.
- ✅ Hook `useIcfPlantAnalysis` aceita `unitOverride` e propaga `__requires_unit_confirmation`, `__detected_unit`, `__sanity_warnings`, `__file_path` para a UI.
- ⏭️ Pré-visualização gráfica do cálculo antes de persistir fica para Fase 7 (painel de revisão técnica).

---

## Fase 6 — Quantitativos ICF unificados (PDF + DXF) ✅

- ✅ Novo motor `src/lib/icf-unified-quantities.ts`: consome `IcfPlantAnalysisResult` (origem PDF/IA ou DXF vetorial) e devolve linhas por parede + totais consolidados (ml ext/int, área bruta/vãos/líquida, blocos base + com desperdício, betão paredes/fundações/lajes, armadura estimada, contagem de revisões, confiança média).
- ✅ Classificação ext/int por regex sobre `referencia` (PE/Ext/Fachada vs PI/Int/Divisória). "Indeterminado" gera aviso.
- ✅ Parâmetros pré-fecho editáveis: pé-direito padrão, espessura núcleo, % desperdício, kg armadura/m³, dimensões do bloco, descontar vãos, incluir fundações. Recalculo em tempo real via `useMemo`.
- ✅ Novo `IcfUnifiedQuantitiesPanel` integrado no `IcfPlantAnalyzer` entre o resultado da análise e o botão "Carregar para o orçamento ICF". Tabela por parede com badge `Rever`/`OK` e KPIs.
- ✅ Reaproveita `IcfPlantAnalysisResult` sem mexer no schema da edge function — ambos os pipelines (PDF e DXF) entram no mesmo painel.
- ⏭️ Edição inline linha-a-linha e persistência consolidada ficam para a **Fase 7 (painel de revisão técnica)**.

---

## Fase 7 — Painel de revisão técnica

## Fase 7 — Painel de revisão técnica ✅

- ✅ Edição inline por linha no `IcfUnifiedQuantitiesPanel`: comprimento, altura, espessura editáveis; ações Validar / Editar / Remover por parede + "Validar todas".
- ✅ Edição manual eleva `confianca` para 0.85 e marca `metodo_medicao='cota'`; validação manual adiciona tag `[validado_humano]` às notas.
- ✅ Novo hook `useIcfQuantitiesReview` atualiza `plan_analysis_versions` (analysis_payload + summary + human_reviewed + requires_review + confidence + notes) e grava evento `revisao_humana_guardada` em `plan_analysis_logs`.
- ✅ Botão "Guardar revisão" com campo de notas, isolado por organização via RLS já existente nas duas tabelas.
- ✅ Nada vai para orçamento sem ação humana — o botão "Carregar para o orçamento ICF" continua a exigir clique explícito a seguir à revisão.

---

## Fase 8 — Integração com orçamento ✅

- ✅ Novo hook `useIcfPlanToBudget` + helper `buildIcfPlanChapters` constroem capítulos a partir dos quantitativos unificados: Paredes ICF Ext, Paredes ICF Int, Blocos ICF, Betão (paredes/fundações/lajes), Armadura, Mão de obra ICF, Observações.
- ✅ Diálogo `IcfPlanToBudgetDialog` com modos "Criar novo" (cria `orcamentos` rascunho) e "Adicionar a existente" (lista filtrada por obra, exclui adjudicados, anexa capítulos no fim respeitando `ordem`).
- ✅ Botão "Enviar para orçamento" no `IcfPlantAnalyzer` ao lado de "Carregar para a configuração ICF" — ambos exigem clique humano explícito.
- ✅ Rastreabilidade nos artigos: `source='axia_icf_planta'`, `linked_element_id=plan_analysis_version_id`, `chapter_code='ICF_PLANTA'`, `article_code='ICF_PLANTA_*'`.
- ✅ Eventos `orcamento_criado` / `orcamento_atualizado` registados em `plan_analysis_logs` com totais e contagens (best-effort).
- ✅ Sem migração de schema — reaproveita `orcamentos`, `capitulos_orcamento`, `artigos_orcamento` existentes.
- ⏭️ Vínculo via `plan_budget_links` fica para iteração futura (requer migração: `measurement_id` atual é `NOT NULL` e não cabe em quantitativos agregados).

---

## Fase 9 — Regras de confiança e logs de auditoria

Política global:
- `≥ 0.85` → confiável
- `0.60–0.85` → revisão obrigatória
- `< 0.60` → bloqueado para uso automático
- Sem escala/unidade/cota → todo o quantitativo exige revisão

Tabela `plan_analysis_logs` (nova): ficheiro, tipo, data, método (gemini/dxf-parser), erros, campos assumidos, campos confirmados pelo user, versão, user_id, organization_id. RLS por organização.

---

## Fase 10 — UI/UX em 7 etapas (stepper)

Stepper claro: Upload → Identificar tipo → Confirmar escala/unidade → Parâmetros ICF → Rever elementos → Gerar quantitativo → Enviar para orçamento. Indicador de etapa sempre visível.

---

## Fase 11 — Catálogo de mensagens ao utilizador

Mensagens curtas, humanas, sem jargão técnico, centralizadas em `src/lib/plan-error-messages.ts` (escala não detetada, layers ambíguos, PDF rasterizado, baixa confiança, cotas insuficientes, etc.).

---

## Fase 12 — Compatibilidade e segurança

- Migrações aditivas apenas (sem `DROP`/quebra de tipo).
- Análises antigas preservadas.
- RLS por `organization_id` em todas as novas tabelas + GRANTs explícitos (`authenticated`, `service_role`).
- Edge functions validam JWT, organização e quota.
- Nada flui para orçamento sem aprovação humana.
- Possíveis tabelas novas (apenas se necessário, sem duplicar existentes): `plan_analysis_versions`, `plan_analysis_logs`. As outras (`plan_files`, `plan_analyses`, `plan_detected_elements`, `plan_icf_quantities`) já têm equivalente — reutilizo.

---

## Fase 13 — Critérios de aceitação

Validação final contra a checklist do pedido (PDF lê, DXF processa vetorialmente, ml/áreas calculados, confiança marcada, revisão obrigatória, criar/atualizar orçamento, reanálise versionada, mensagens claras, fluxo antigo intacto, logs gravados, preparado para BIM/IFC futuro).

---

## Detalhes técnicos

**Stack**: pipeline PDF mantém-se em `icf-plant-analysis` (Gemini 2.5 Pro/Flash). Pipeline DXF nova edge function `plan-dxf-parse` usando `npm:dxf-parser` em Deno. Quantitativos consolidados em `plan_quantitativos_v` (já existente) estendido para incluir origem DXF. Frontend: novo stepper em `src/components/plantas/`, painel de revisão reaproveitando componentes ICF existentes.

**Modelo IA**: PDF → `google/gemini-2.5-pro` (fallback `gemini-2.5-flash`). DXF → parser puro; IA só para classificar layers ambíguos (`google/gemini-3-flash-preview`, texto).

**Migrações previstas**: adicionar `'dxf'` ao file_type de `plan_imports`; nova tabela `plan_analysis_logs`; opcional `plan_analysis_versions` se versionamento atual não chegar.

---

## O que NÃO faço nesta entrega

- Não toco em BIM/IFC (fora de âmbito, mas a arquitetura fica preparada).
- Não removo fluxos existentes.
- Não envio nada para orçamento sem clique humano explícito.
- Não implemento todas as fases num único ciclo — entrego e valido Fase 1+2 (PDF estabilizado) antes de começar DXF.

---

## Próximo passo

Confirma se queres que comece **já pela Fase 1 (auditoria, sem alterações de código)** e te entregue o relatório antes de avançar para a Fase 2, ou se preferes que junte Fase 1+2 num único ciclo (auditoria + correções PDF).
