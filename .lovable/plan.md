# Assistente ICF a partir de Arquitetura

Novo fluxo dentro do módulo ICF que aceita plantas arquitetónicas comuns (não-ICF) e produz um pré-quantitativo com rastreabilidade total: o que foi extraído, calculado, sugerido pela Axia ou confirmado pelo utilizador. Mantém o módulo ICF atual intacto — é um caminho paralelo.

## Entrega

### 1. Base de dados (1 migração)

Nova tabela `icf_assistant_sessions` (uma sessão = um upload + escolhas do utilizador) e `icf_assistant_items` (cada parede/fundação/laje proposta, com `source_type`, `review_required`, `confidence`, `assumptions`, `notes`, `user_confirmed`).

Enum `icf_source_type`: `extraido_planta | calculado_sistema | sugerido_axia | confirmado_utilizador`.

Multi-tenant (`organization_id`), RLS + GRANTs no padrão do projeto.

### 2. Edge function `icf-architecture-assistant`

Nova função (não toca `icf-plant-analysis`). Recebe planta + tipo declarado + escala calibrada. Usa Gemini 2.5 Pro com prompt específico:
- Identifica paredes exteriores vs interiores, vãos, pisos, áreas, compartimentos
- **Nunca inventa fundações** — quando ausentes, devolve `fundacoes_encontradas: false` com mensagem obrigatória
- Marca cada parede com `candidata_icf` (exteriores por default, interiores nunca sem confirmação)
- Cada item retornado tem `source_type`, `confidence`, `assumptions[]`

### 3. Motor de sugestão de fundações (`src/lib/icf-foundation-suggestions.ts`)

6 opções parametrizáveis (sapata contínua, laje térrea com bordo, stem wall, cave ICF, radier, sem fundações). Cada uma com schema de campos e cálculo de quantitativos a partir do perímetro/área das paredes ICF confirmadas. Todos os outputs com `source_type: sugerido_axia`, `review_required: true`.

### 4. UI — Wizard de 6 passos (`/icf/assistente`)

```text
1. Upload + tipo de planta (arquitetura/estrutural/ICF/não sei)
2. Calibração por medida conhecida (reutiliza usePlanCalibration)
3. Pisos & páginas (reutiliza usePlanFloors/usePlanPages)
4. Extração + seleção: tabela com checkboxes "É ICF?" por parede;
   exteriores pré-marcadas, interiores não
5. Parâmetros ICF (núcleo, betão, aço — reutiliza IcfConfig)
6. Fundações: se não encontradas → painel "Fundações não encontradas"
   com 6 cards de opção e formulário paramétrico por opção
```

Painel final: 4 secções coloridas (Extraído / Calculado / Sugerido / Requer revisão) + 2 botões:
- **Gerar pré-orçamento ICF** — inclui sugestões com flag visível
- **Gerar orçamento validado** — só itens com `user_confirmed = true`

Reutiliza `generate_icf_budget_transactional` existente; capítulo marca itens sugeridos com tag `[REVISÃO TÉCNICA]`.

### 5. Integração

- Novo card no `IcfQuickNav`: "Assistente ICF (planta arquitetura)"
- Rota `/icf/assistente` em `App.tsx` com `ManagerRoute`
- Hooks: `useIcfAssistantSession`, `useIcfFoundationSuggestions`
- Tipos em `src/types/icf-assistant.ts`

## Detalhes técnicos

**Source tracking:** cada item passa pelo banco com origem auditável. View `icf_assistant_audit_v` para relatórios.

**Confidence thresholds:** `<0.6` força badge vermelho "Requer revisão"; mesmo com confirmação do utilizador, mantém histórico no `assumptions[]`.

**Mensagem obrigatória** (constante exportada, usada na UI + função): _"Não foram identificadas fundações ou sapatas na planta arquitetónica. A Axia pode sugerir uma solução preliminar para orçamento, mas a definição final deve ser validada por técnico/engenheiro responsável."_

**Não inclui:** refazer `icf-plant-analysis` (continua válido para plantas ICF nativas); alterar `IcfPlantAnalyzer` (fluxo paralelo).

## Ficheiros novos
- `supabase/migrations/*_icf_assistant.sql`
- `supabase/functions/icf-architecture-assistant/index.ts`
- `src/types/icf-assistant.ts`
- `src/lib/icf-foundation-suggestions.ts` (+ teste)
- `src/hooks/useIcfAssistantSession.ts`
- `src/pages/icf/AssistenteArquitetura.tsx` (wizard)
- `src/components/icf/assistant/` (StepUpload, StepWallSelection, StepFoundations, AuditPanel, FoundationOptionCard, SourceBadge)

## Ficheiros editados (mínimo)
- `src/App.tsx` — rota nova
- `src/components/icf/IcfQuickNav.tsx` — atalho novo
