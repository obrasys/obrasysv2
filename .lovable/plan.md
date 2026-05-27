# Evolução do Módulo ICF — HOMEBLOCK

Implementação incremental e segura, sem mexer na lógica de cálculo atual nem nas integrações existentes (Axia, orçamento, plantas, RLS multi-tenant).

## 1. Assets dos SVGs

Copiar os 7 SVGs anexados para:

```
public/icf/homeblock/
  homeblock-bloco-220mm.svg
  homeblock-bloco-300mm.svg
  homeblock-detalhes-corte.svg
  homeblock-espacador-150mm.svg
  homeblock-espacador-220mm.svg
  homeblock-topo-150mm.svg
  homeblock-topo-220mm.svg
```

Renderizados via `<object type="image/svg+xml">` ou `<img src>` (assets estáticos, sem `dangerouslySetInnerHTML`, sem execução de scripts embutidos).

## 2. Base de Dados (Supabase, multi-tenant)

Migration que cria duas novas tabelas com `organization_id`, RLS via `get_org_member_ids()`, e GRANTs conforme padrão do projeto.

### `icf_block_library`
Catálogo de peças HOMEBLOCK (e futuras famílias):
- `code` (único por org), `name`, `category` (enum: bloco_principal, topo, espacador, detalhe_tecnico, canto, meio_bloco, especial)
- `length_mm`, `height_mm`, `thickness_mm`, `module_mm`
- `drawing_file` (caminho público), `can_be_cut`, `use_case`, `notes`
- `system_seed boolean` para distinguir biblioteca semente (HOMEBLOCK oficial) de itens criados pelo utilizador

RLS: leitura para membros da org **OR** itens com `organization_id IS NULL` (seed global); escrita só para org owner/admin.

Seed: inserir os 7 itens HOMEBLOCK com `organization_id = NULL` (visíveis a todos).

### `icf_wall_panels`
Mapa visual de panos analisados (separado dos `icf_panos_parede` existentes para **não quebrar** o cálculo atual). Liga-se opcionalmente a um `icf_panos_parede` por `source_pano_id`.
- `obra_id`, `configuracao_id`, `floor`, `room`, `label`
- `length_m`, `height_m`, `thickness_mm`, `selected_block_code`
- `gross_area_m2`, `net_area_m2` (gerados)
- `openings jsonb` (array de `{type, width_m, height_m, sill_height_m?, position_m?}`)
- `status` enum: rascunho, em_revisao, validado, enviado_orcamento, bloqueado
- `confidence numeric`, `source` enum (axia, manual, corrigido)
- `composition_result jsonb` (último resultado calculado, para rastreabilidade)

RLS multi-tenant padrão.

## 3. Motor de Composição (puro, testável)

`src/lib/icf-homeblock-composition.ts`:

```ts
calculateICFWallComposition(panel, block): ICFWallCompositionResult
```

Regras:
- `rows = floor(H_mm / block.heightMm)`, sobra altura → warning + remate
- `blocksPerRow = floor(L_mm / block.lengthMm)`, sobra horizontal → warning + corte sugerido
- `baseQty = rows * blocksPerRow`
- Aberturas: desconto por **área equivalente** com `Math.ceil(opArea / blockArea)` + warning explícito
- Acessórios estimados: topo (perímetro superior/L_topo), espaçador (1 a cada 2 fiadas — heurística inicial), perdas 5%
- Devolve `cutSuggestions[]`, `accessories[]`, `warnings[]`

Testes vitest em `src/lib/icf-homeblock-composition.test.ts`: fiadas, sobras, desconto de aberturas, resumo.

## 4. UI — Nova aba "Biblioteca Técnica" e "Mapa Visual"

Adicionar na navegação ICF existente (`src/pages/icf/`):
- `BibliotecaTecnica.tsx` — grid de cards (`ICFBlockCard`) com SVG (`ICFBlockSvgViewer`), abre modal com zoom
- `MapaVisualPanos.tsx` — lista de `icf_wall_panels` por obra, filtros por estado, cards com `ICFWallPanelVisualizer` (SVG proporcional: fiadas, divisões, aberturas, sobras)
- `ManualICF.tsx` — manual dinâmico (sistema, peças, composição por pano, avisos, disclaimer obrigatório), botão "Preparar PDF" (placeholder export)

Componentes em `src/components/icf/library/` e `src/components/icf/panels/`.

Padrão visual: cards `rounded-xl`, deep teal, sem sobrecarga, alertas para baixa confiança, badges de estado.

## 5. Hooks

`src/hooks/useIcfBlockLibrary.ts` — list + CRUD da biblioteca  
`src/hooks/useIcfWallPanels.ts` — list/create/update/validate/sendToBudget  
Mutação `sendICFCompositionToBudget` reaproveita `generate_icf_budget_transactional` existente (sem alterar a função), envia um capítulo "Sistema ICF / HOMEBLOCK" com os artigos sugeridos.

## 6. Axia

Estender o prompt do edge function `icf-plant-analysis` (e/ou `axia-analysis`) com o bloco "Biblioteca Técnica como fonte primária / SVGs apenas referência visual / nunca inventar medidas / classificar confiança / sinalizar revisão humana". Sem alterar o contrato de I/O atual.

## 7. Disclaimer obrigatório

Renderizado no Manual e no rodapé do Mapa Visual:

> As medições e composições ICF geradas pela Axia são estimativas assistidas… O Obra Sys não substitui projeto executivo, cálculo estrutural ou responsabilidade técnica de obra.

## O que NÃO muda

- `icf_configuracoes`, `icf_panos_parede`, `icf_vaos`, `icf_fundacoes`, `icf_lajes`, triggers de cálculo, snapshots, função `generate_icf_budget_transactional`.
- Fluxo atual de "Análise de Planta ICF" (`IcfPlantAnalyzer`) continua a funcionar; o novo Mapa Visual é uma camada paralela opcional.

## Ordem de entrega

1. Copiar SVGs + migration (biblioteca + panos + seed HOMEBLOCK)
2. Motor de composição + testes
3. Hooks + páginas Biblioteca Técnica e Mapa Visual
4. Manual ICF + envio para orçamento
5. Ajuste do prompt Axia
