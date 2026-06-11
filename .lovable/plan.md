# Plano — Axia multi-folha + Sugestão de Fundação ICF

Objetivo: permitir que a Axia leia projetos com múltiplas folhas (arquitetura + estrutura), classifique cada folha por disciplina/piso, e gere quantitativos rastreáveis. Quando não houver estrutura, oferecer fluxo guiado de **Sugestão Preliminar de Fundação ICF**.

---

## 1. Base de dados (migration)

### 1.1 Estender `plan_pages`
Adicionar colunas (nullable, default seguro):
- `sheet_title text`
- `drawing_code text`
- `discipline text` — `arquitetura | estrutura | mep | outro`
- `sheet_type text` — `planta_fundacoes | armaduras_sapatas | quadro_pilares | planta_estrutural | armaduras_vigas | armaduras_lajes | armaduras_paredes | pormenor_icf | pormenor_metalico | planta_arquitetura | alcado | corte | cobertura | outro`
- `detected_floor text` — `fundacao | piso_-1 | piso_0 | piso_1 | piso_2 | cobertura | generico`
- `should_extract_quantities boolean default true`
- `use_for_validation_only boolean default false`
- `classification_confidence numeric(3,2)`
- `classification_warnings jsonb default '[]'`
- `classified_by text` — `axia | user`
- `classified_at timestamptz`

### 1.2 Estender `plan_measurements` e `plan_placed_elements`
- `piso_origem text`
- `folha_origem text` (sheet_title livre)
- `pagina_origem int` (FK lógico para plan_pages.page_number)
- `disciplina_origem text`
- `metodo_calculo text`
- `estado_quantitativo text default 'manual'` — `confirmado_por_projeto_estrutura | sugestao_preliminar | manual | extraido_arquitetura`
- `confidence_score numeric(3,2)`
- `requer_validacao_tecnica boolean default false`
- `observacoes text`

(Mesmas colunas em `plan_additional_items` para itens sugeridos sem origem geométrica.)

### 1.3 Nova tabela `plan_foundation_suggestions`
Guarda a sessão do wizard "Sugestão de Fundação ICF":
```
id uuid pk, plan_import_id uuid fk, obra_id uuid, user_id uuid, organization_id uuid,
inputs jsonb,        -- respostas ao questionário
result jsonb,        -- itens sugeridos + raciocínio Axia
status text,         -- draft | gerado | aplicado | descartado
generated_at timestamptz, applied_at timestamptz,
created_at, updated_at
```
GRANT + RLS por organização (mesmo padrão de `plan_imports`).

---

## 2. Edge functions

### 2.1 Nova `axia-classify-sheets`
Input: `plan_import_id`. Lê todas as `plan_pages` + snapshot OCR/thumbs. Chama Gemini 2.5 Pro (multi-imagem) com prompt PT-PT baseado em `AXIA_GLOBAL_SAFETY_BLOCK`. Devolve por página: `sheet_title, drawing_code, discipline, sheet_type, detected_floor, should_extract_quantities, use_for_validation_only, confidence, warnings`. Persiste em `plan_pages` e regista em `plan_analysis_logs`.

### 2.2 Estender `axia-analysis` (e specialty)
Após classificação, ao gerar measurements/elementos passa a preencher os novos campos de origem e `estado_quantitativo`:
- folhas `discipline='estrutura'` → `confirmado_por_projeto_estrutura`
- folhas `discipline='arquitetura'` → `extraido_arquitetura`
Regra anti-duplicação: se existe folha estrutural para o mesmo piso, suprimir extrações estruturais derivadas da arquitetura (paredes portantes, lajes, fundações).

### 2.3 Nova `axia-foundation-suggestion`
Input: `plan_import_id` + respostas do questionário. Gera itens preliminares ICF (fundação contínua perímetro, sapatas isoladas, laje térrea, betão limpeza, drenagem, arranques, vigas fundação) com base no perímetro do R/C e regras do `icf-foundation-suggestions.ts` existente. Persiste `plan_foundation_suggestions` e cria linhas em `plan_additional_items` com `estado_quantitativo='sugestao_preliminar'`, `requer_validacao_tecnica=true`, `observacoes` padrão. Reutiliza `AXIA_GLOBAL_SAFETY_BLOCK` + `icf-foundation-suggestions`.

---

## 3. Hooks

- `useSheetClassification(planImportId)` — invoca `axia-classify-sheets`, query de `plan_pages` enriquecidas, mutation `updateSheet` (correção manual: discipline/sheet_type/floor/should_extract).
- `useFoundationSuggestion(planImportId)` — carrega/cria `plan_foundation_suggestions`, mutation `generate` (chama edge), mutation `discard`/`apply`.
- Estender `usePlanQuantitativos` para incluir os novos campos e expor `grouping` por `(disciplina, piso, folha)`.

## 4. UI

### 4.1 Painel "Folhas identificadas" (`SheetsIdentifiedPanel.tsx`)
Renderizado em `pages/plantas/Detail.tsx` antes do painel de quantitativos. Lista cards: thumbnail (já existe via `plan_pages.thumbnail_url`), nº página, título, badges disciplina/tipo/piso, estado (`Usar p/ quantitativos | Validação | Ignorar`), barra de confiança, botão "Editar classificação" (dialog com selects). Botão topo: "Reclassificar com Axia".

### 4.2 Aba "Estrutura e Fundação" (`StructureFoundationTab.tsx`)
Adicionar tab no Detail. Dois estados:
- **A — Encontrada**: badge verde + lista folhas estruturais usadas + link "Ver quantitativos estruturais".
- **B — Não encontrada**: alerta amber + mensagem obrigatória + 3 botões (`Gerar sugestão preliminar`, `Enviar pedido de validação técnica`, `Ignorar por agora`).

### 4.3 Wizard `FoundationSuggestionWizard.tsx`
Dialog stepper 3 passos: Questionário (nº pisos, cave, garagem, terreno, ICF integral, muros contenção, grandes vãos, tipo laje térrea, altura pisos, localização) → Resumo → Resultado (lista itens sugeridos com badges "preliminar", botão "Aplicar ao orçamento" / "Descartar"). Toast com aviso técnico ao concluir.

### 4.4 Mapa de quantitativos agrupado
Em `pages/plantas/Quantitativos.tsx` (ou componente equivalente) agrupar por:
- Arquitetura — R/C / 1º Piso / Cobertura / Fachadas
- Estrutura — Fundação / Piso 0 / Piso 1 / Armaduras / Perfis metálicos
- Fundação sugerida

Cada linha mostra badge de `estado_quantitativo` (Confirmado/Preliminar/Manual) + tooltip `folha_origem · pág X · disciplina`.

## 5. Regras anti-erro (lib)

Novo `src/lib/plan-sheet-classification.ts`:
- heurísticas regex iniciais (fallback offline) para `sheet_type`/`discipline`/`floor` a partir do título/drawing_code.
- função `dedupeAcrossDisciplines(measurements)` que, para o mesmo piso, mantém o item estrutural quando existir e descarta o equivalente vindo da arquitetura.

## 6. Testes
- `plan-sheet-classification.test.ts` — regex/heurísticas.
- `icf-foundation-suggestions.test.ts` — adicionar casos com novas inputs (cave, garagem, grandes vãos).
- Smoke manual: PDF EST.-ICF (11 páginas) deve classificar conforme exemplo.

## 7. Memória do projeto
Atualizar `mem://features/medicao-planta/overview` e adicionar:
- `mem://features/medicao-planta/multi-sheet-classification`
- `mem://features/icf/foundation-suggestion-flow`

---

### Notas técnicas
- Reaproveitar `pdf-to-image.ts` para thumbnails por página.
- Gemini 2.5 Pro com multi-image input via Lovable AI Gateway (até ~20 páginas por chamada; chunking se mais).
- Mensagens e UI 100% PT-PT, deep teal + rounded-xl conforme design system.
- Nenhum item sugerido entra como confirmado; trigger DB poderia validar, mas começamos com regra na edge function.

### Fora do âmbito (próxima fase)
- Dimensionamento estrutural real (continua a depender de engenheiro).
- Sincronização automática com cronograma/MCE — só após validação técnica.
