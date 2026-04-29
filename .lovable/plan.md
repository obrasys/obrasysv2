## Objetivo

Resolver três pontos no módulo Plantas:

1. **Qualidade da imagem no canvas** — a planta atual é renderizada com PDF.js a `scale = 1.5` o que dá uma imagem pouco nítida em ecrãs grandes / retina.
2. **Tabela completa da Análise Visual Axia** — hoje as cotas, compartimentos e elementos só aparecem como linhas individuais sem uma vista tabular consolidada com toda a informação.
3. **Análise multi-página / multi-planta** — quando o PDF tem várias plantas (folhas), o utilizador apenas analisa a página visível. É preciso permitir analisar cada folha e também carregar uma nova planta sem sair do detalhe.

---

## 1. Aumentar a qualidade do render do PDF

Ficheiro: `src/hooks/usePdfRenderer.ts`

- Aumentar a `scale` por defeito de `1.5` → `2.5` e multiplicar pelo `window.devicePixelRatio` (clamp entre 2 e 4) para canvases retina.
- Aplicar `imageSmoothingQuality = 'high'` no contexto 2D antes do `render`.
- Exportar `toDataURL('image/png')` (já é o default) mas garantir PNG sem compressão lossy.
- Em `Detail.tsx` passar uma `scale` explícita (ex.: `2.5`) ao `usePdfRenderer` para os utilizadores beneficiarem mesmo em monitores não-retina.

Resultado: planta visivelmente mais nítida, mantendo as coordenadas de calibração (que são em píxeis da imagem renderizada — a calibração já se ajusta porque tudo é proporcional).

> Nota: imagens (não PDF) já usam o ficheiro original em resolução nativa, não precisam de mudança.

---

## 2. Tabela completa dos resultados da Análise Visual

Criar um novo componente `src/components/plantas/PlanAxiaResultsTable.tsx`:

- Dialog full-screen (`Dialog` + `DialogContent` com `max-w-6xl`) com 3 abas (`Tabs`):
  - **Cotas** — colunas: Valor, Unidade, Etiqueta/Descrição, Confiança, Posição (X,Y), ação "Ir para" (chama `onHighlightPosition`).
  - **Compartimentos** — colunas: Nome, Área estimada (m²), Confiança, Posição, ação "Ir para".
  - **Elementos** — colunas: Tipo, Etiqueta, Quantidade, Posição, ação "Ir para".
- Cada aba com pesquisa (`Input` filtra por nome/etiqueta) e botão "Exportar CSV" (UTF-8 BOM, separador `;` — já é standard do projeto, ver memória *Blueprint Export Standard*).
- Botão "Ir para" usa o callback existente `onHighlightPosition` para dar pan/zoom à coordenada no canvas.

Em `PlanAIAnalysis.tsx`:

- Adicionar um botão proeminente **"Ver tabela completa"** (ícone `Table2`) no topo do bloco de resultados (entre o `summary` e a primeira secção colapsável), que abre o novo dialog.
- Manter as listas colapsáveis atuais (preview rápido lateral) — o dialog é o detalhe completo.

---

## 3. Fluxo multi-página e upload de nova planta

### 3a. Tornar visível a navegação de páginas + analisar página atual

`PlanViewer.tsx` já tem controlos `←  1/N  →` quando `totalPages > 1`. Vamos:

- Adicionar um badge/destaque no header do canvas a indicar **"Folha X de N"** quando o PDF tem múltiplas folhas, com cor de aviso quando ainda não foi analisada.
- Adicionar estado `analyzedPages: Set<number>` em `Detail.tsx` (persistido em `localStorage` por `planId`) para marcar páginas já analisadas.
- O `handleAnalyze` da Axia recebe `currentPage` e o `imageDataUrl` da página visível (já é assim, porque `usePdfRenderer` re-renderiza ao mudar página).

### 3b. Painel "Plantas neste ficheiro"

Em `PlanAIAnalysis.tsx` (ou novo bloco no sidebar do `Detail.tsx`), quando `totalPages > 1`:

- Mostrar uma lista compacta `Folha 1, Folha 2, ...`, cada uma com:
  - Indicador visual: ✓ analisada (verde) / ⏳ pendente (cinza).
  - Botão **"Analisar esta folha"** que muda `currentPage` e dispara automaticamente a análise quando a página termina de renderizar.
- Botão "Analisar todas as folhas em falta" (sequencial, com `toast` de progresso `1/N`).

### 3c. Carregar nova planta sem sair da página

Atualmente `PlanUploadForm.tsx` é usado em `/plantas` (Index). Vamos reutilizá-lo:

- Adicionar botão **"Carregar nova planta"** no header do `Detail.tsx` (ao lado de `Voltar`), que abre um `Dialog` com `<PlanUploadForm obraId={obraId} onSuccess={(newPlanId) => navigate(\`/obras/${obraId}/plantas/${newPlanId}\`)} />`.
- Após upload bem-sucedido, navegar para o detalhe da nova planta (mantém o utilizador no fluxo).

---

## Detalhes técnicos

### Persistência de páginas analisadas

Como cada análise pode ser custosa (Gemini Vision), guardar os resultados por (planId, pageNumber):

- Estado local em `Detail.tsx`: `Map<number, PlanAnalysisResult>` em vez do estado interno único do `PlanAIAnalysis`.
- Refatorar `PlanAIAnalysis` para receber `result` e `onResultChange` como props controladas, mantendo o `handleAnalyze` interno.
- Persistir em `localStorage` chave `plan-axia:{planId}:page-{n}` (ou opcionalmente coluna JSONB `axia_analysis_per_page` em `plan_imports` numa fase futura — fora deste scope).

### Ficheiros a tocar

Criados:
- `src/components/plantas/PlanAxiaResultsTable.tsx` — dialog tabular com 3 abas + export CSV.
- `src/components/plantas/PlanPagesPanel.tsx` — lista de folhas com estado de análise + botões de ação.

Editados:
- `src/hooks/usePdfRenderer.ts` — scale dinâmica baseada em DPR + smoothing alta qualidade.
- `src/components/plantas/PlanAIAnalysis.tsx` — receber `result/onResultChange` controlados, botão "Ver tabela completa", integrar `PlanPagesPanel` quando `totalPages > 1`.
- `src/pages/plantas/Detail.tsx` — `Map` de resultados por página, persistência em localStorage, botão "Carregar nova planta" no header com dialog wrapper, passar `currentPage`/`totalPages`/`setCurrentPage` ao painel Axia.

### Compatibilidade

- Calibração mantém-se válida (resolução muda mas as coordenadas continuam em píxeis da imagem renderizada — `pixels_per_meter` recalcula proporcionalmente apenas se a calibração for refeita; render mais nítido não invalida calibrações existentes porque o canvas usa `effectiveDimensions` para mapeamento).
- Análises de páginas anteriores não são perdidas se o utilizador navegar entre folhas.

---

## Fora do scope

- Persistir análises em base de dados (mantemos localStorage por agora; migração futura).
- OCR/extração avançada para folhas que não sejam plantas (ex.: notas, legendas).