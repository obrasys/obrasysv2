## Contexto

Dois problemas no Assistente ICF (Arquitetura) acedido a partir do "Orçamento ICF (sem obra)":

1. **Upload da planta falha** — o utilizador carrega tipicamente um PDF. Na fase anterior protegemos a edge function `icf-architecture-assistant` para devolver 400 quando o ficheiro não é imagem, porque o gateway da Axia (Gemini vision) só aceita PNG/JPG/WEBP/GIF. Resultado: o upload do PDF "sobe", mas a análise rebenta com a mensagem de formato não suportado — o utilizador vê isto como "não consigo carregar planta".
2. **Fundações em falta** — quando a planta arquitetónica não tem fundações desenhadas (caso comum), a Axia devolve `fundacoes_encontradas: false`. Hoje o aviso só aparece no passo 5 quando o utilizador lá chega; o pedido é que isso force imediatamente um modal para preencher os dados de fundações.

O projeto já tem `pdfjs-dist@4.9.155` instalado (`src/hooks/usePdfRenderer.ts`) — vamos reutilizar.

## O que vai mudar

### 1. Carregar planta com PDF a funcionar (`src/pages/icf/AssistenteArquitetura.tsx`)

No `handleUpload`, antes de fazer upload para o bucket `plan-files`:

- Se `file.type === 'application/pdf'` ou extensão `.pdf`:
  - Usar `pdfjs-dist` para renderizar a **primeira página** num `<canvas>` offscreen a escala 2x.
  - Converter o canvas em `Blob` PNG (`canvas.toBlob`).
  - Fazer upload desse PNG para `plan-files` com extensão `.png`.
  - Guardar também o PDF original (caminho separado) para a calibração visual continuar a ter o ficheiro vetorial.
  - Adicionar campo `source_pdf_path` opcional na sessão? Não — para evitar migração agora, guardar apenas o PNG como `file_path` (o calibrador já aceita PNG via `usePdfRenderer`/`createImageBitmap` pelo browser).
- Se já for imagem (PNG/JPG/WEBP), comportamento atual.
- Mostrar toast com progresso ("A converter PDF para imagem...") e tratar erros de renderização (PDF protegido, página corrompida) com mensagem clara.

Não mexer na edge function — a validação introduzida na fase anterior continua válida como rede de segurança.

### 2. Modal automático "Definir fundações manualmente"

Novo componente `src/components/icf/assistant/IcfFoundationsModal.tsx`:

- `Dialog` do shadcn, abre com `open` controlado pelo `AssistenteArquitetura`.
- Conteúdo = mesma grelha das 6 `FoundationOptionCard` já existentes em `FOUNDATION_OPTIONS` (reaproveitar o componente, sem duplicar UI).
- Cabeçalho explica que a Axia não detetou fundações na planta e que o utilizador precisa de as definir para o orçamento.
- Ao confirmar uma opção, chama o mesmo `applyFoundation.mutate(...)` e marca `session.foundations_user_provided = true` (campo já não existe → marcar via `current_step = 5` + `foundation_option`, sem precisar de migração).

Em `AssistenteArquitetura.tsx`, no `runAxiaExtraction`:

- Quando a resposta tiver `summary.foundations_found === false` **e** for uma sessão sem obra (orçamento puro) ou simplesmente sempre que faltarem fundações, abrir o novo modal automaticamente (`setFoundationsModalOpen(true)`).
- O modal **só** abre quando `foundations_found === false`. Se houver fundações desenhadas, nada muda.
- Manter o passo 5 atual (continua a ser editável depois).

### 3. Pequenos ajustes

- Garantir que o `Select` da obra opcional no Index ICF não bloqueia o assistente quando se vai para `/icf/assistente` sem `?obra=` (já suportado pela leitura de `initialObra` que pode ser `null`).

## Detalhes técnicos

- pdfjs-dist worker: usar o pattern já existente em `usePdfRenderer.ts` (`pdfjsLib.GlobalWorkerOptions.workerSrc`). Reutilizar uma função utilitária pequena `renderPdfFirstPageToBlob(file: File): Promise<Blob>` colocada em `src/lib/pdf-to-image.ts` para isolar a lógica.
- Upload do PNG: caminho `${user.id}/icf-assistant/${uuid}.png` (igual ao padrão atual, só muda extensão).
- O modal usa exatamente o mesmo `applyFoundation` hook que o passo 5 — zero alterações ao schema da BD nem à edge function.
- Nenhuma alteração ao backend / RLS / migrações.

## Ficheiros tocados

- novo: `src/lib/pdf-to-image.ts`
- novo: `src/components/icf/assistant/IcfFoundationsModal.tsx`
- editado: `src/pages/icf/AssistenteArquitetura.tsx` (handleUpload + abrir modal quando `foundations_found=false`)

## Fora do âmbito

- Não tocar em `IcfPlantAnalyzer` antigo (em standby).
- Não alterar o `icf-architecture-assistant` edge function.
- Não converter mais do que a primeira página do PDF nesta iteração (raramente as fundações estão em página separada do mesmo ficheiro arquitetónico — se for preciso, fica para outra fase).
