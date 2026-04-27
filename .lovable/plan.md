
# Auditoria Técnica — Módulo ICF (Obra Sys)

> Relatório de diagnóstico apenas. **Nenhuma alteração de código é executada nesta fase.** Após aprovação, propõe-se um plano de implementação por fases.

---

## A. Resumo executivo

O módulo ICF é funcional do ponto de vista de **levantamento técnico** (panos, vãos, fundações, lajes, vista `icf_resumo_obra`), com cálculos paramétricos sólidos para volume de betão e aço. O motor `icfSteelCalculation.ts` e os triggers `icf_calc_*` produzem quantitativos coerentes em SQL.

Contudo, a **ponte entre o resumo ICF e o orçamento gerado** (`useGenerateIcfBudget` → `orcamentos / capitulos_orcamento / artigos_orcamento`) tem inconsistências **críticas** que se traduzem em **três fontes de verdade divergentes** entre UI, base de dados e PDF.

**Severidade global: ALTA.** Existe pelo menos um bug que provoca **dupla aplicação de margem** no orçamento gerado a partir do ICF, o que distorce o preço final visível ao utilizador e ao cliente.

---

## B. Mapa de fluxo atual

```text
┌────────────┐   ┌──────────────┐   ┌─────────────────┐   ┌─────────────┐
│  UI ICF    │──▶│ icf_panos_*  │──▶│ icf_resumo_obra │──▶│ Resumo.tsx  │
│ (panos,    │   │ icf_fund_*   │   │  (VIEW SQL)     │   │ (KPIs)      │
│  vãos,     │   │ icf_lajes    │   │ triggers        │   │             │
│  fund.,    │   │ + vaos       │   │ icf_calc_*      │   │             │
│  lajes)    │   │              │   │                 │   │             │
└────────────┘   └──────────────┘   └────────┬────────┘   └──────┬──────┘
                                              │                   │
                                              ▼                   ▼
                                    ┌────────────────────────────────┐
                                    │ useGenerateIcfBudget           │
                                    │ - buildChapters()              │
                                    │ - calcPrecoVenda(custo,margem) │  ◀── (1) margem aplicada AQUI
                                    │ - INSERT orcamentos            │
                                    │ - INSERT capitulos_orcamento   │
                                    │ - INSERT artigos_orcamento     │
                                    │   (preco_unitario = JÁ COM     │
                                    │    margem; preco_base = custo) │
                                    └────────────┬───────────────────┘
                                                 │
                          ┌──────────────────────┴──────────────────────┐
                          ▼                                             ▼
                ┌─────────────────────┐                       ┌──────────────────┐
                │ Orçamento Ver.tsx   │                       │ orcamento-pdf.ts │
                │ aplica DIVISÃO POR  │  ◀── (2) margem       │ aplica DIVISÃO   │ ◀── (3) margem
                │ (1 - margem) sobre  │     RE-APLICADA       │ POR (1 - margem) │     RE-APLICADA
                │ preco_unitario      │                       │ sobre preco_unit │
                └─────────────────────┘                       └──────────────────┘
```

**Resultado**: a UI/PDF mostram preços **com margem aplicada duas vezes**.

---

## C. Bugs encontrados (ordenados por severidade)

### 🔴 CRÍTICO 1 — Dupla aplicação de margem no orçamento ICF

**Localização**:
- `src/hooks/useIcfBudget.ts` linhas 252-261, 319-323
- `src/pages/orcamentos/Ver.tsx` linhas 391-394, 354-355, 432-454
- `src/lib/orcamento-pdf.ts` linhas 337-338, 398, 439-446

**Causa**:
1. `useGenerateIcfBudget` calcula `preco_unitario = calcPrecoVenda(custo, margem)` e guarda este valor **já com margem** em `artigos_orcamento.preco_unitario`. Guarda também o `preco_base = custo`.
2. `Ver.tsx` e `orcamento-pdf.ts` partem do princípio (correto para orçamentos manuais) que `preco_unitario` é o **custo** e voltam a aplicar `preco_unitario / (1 - margem%)` para mostrar o preço de venda.
3. Resultado: um custo de 100€ com margem 20% aparece como 100/0.8/0.8 = **156,25€** em vez de 125€.

**Impacto**: preço final do PDF e da UI **superior ao real**, perda de confiança comercial.

**Reprodução**: criar config ICF com 1 m² de pano, gerar orçamento com margem 20%, observar que o preço unitário no orçamento final ≠ ao custo de origem ÷ 0.8.

**Severidade**: **CRÍTICA**.

---

### 🔴 CRÍTICO 2 — `valor_total` nunca é persistido nos artigos/capítulos ICF

**Localização**: `src/hooks/useIcfBudget.ts` linhas 313-323; ausência de triggers SQL em `artigos_orcamento` e `capitulos_orcamento`.

**Causa**:
- O INSERT em `artigos_orcamento` **não inclui `valor_total`**, deixando o campo em 0 (default).
- As funções `update_capitulo_valor_total()` e `update_orcamento_valor_total()` existem em SQL mas **não estão ligadas a nenhum trigger** (verificado: `information_schema.triggers` retorna vazio para essas tabelas).
- `capitulos_orcamento.valor_total` e `orcamentos.valor_total` ficam também a 0.

**Impacto**:
- Listagens de orçamentos mostram **0 €** como valor do orçamento ICF até reabrir/recalcular.
- Dashboard financeiro e KPIs de comercial subestimam o pipeline.
- Forçar UI a recalcular tudo do zero a cada render (já visível em `Ver.tsx:351` e `orcamento-pdf.ts:394` que ignoram `cap.valor_total`).

**Severidade**: **CRÍTICA**.

---

### 🟠 ALTA 3 — Geração de orçamento não é atómica

**Localização**: `useIcfBudget.ts` linhas 271-327 (sequência de inserts soltos).

**Causa**: 5+ INSERTs sequenciais sem transação (Supabase JS não suporta `BEGIN/COMMIT` no cliente). Se `INSERT artigos_orcamento` falhar a meio, ficam **capítulos órfãos** ou orçamento parcialmente populado.

**Impacto**: estados inconsistentes em caso de erro de rede ou RLS; sem rollback automático.

**Severidade**: ALTA.

**Recomendação**: mover lógica para uma **Edge Function `generate-icf-budget`** (ou RPC SQL) que execute todo o INSERT numa única transação, com validação server-side e rollback.

---

### 🟠 ALTA 4 — Quantidades arredondadas antes do cálculo final

**Localização**: `useIcfBudget.ts` linha 88 — `quantidade: Math.round(quantidade * 1000) / 1000`.

**Causa**: arredonda quantidades a 3 casas decimais **antes** de multiplicar por preço. Para grandes áreas, acumula erro de centavos no total. O motor de aço (`icfSteelCalculation.ts`) também arredonda `weight_kg` a 1 casa decimal nas camadas individuais antes de somar.

**Impacto**: divergência entre o resumo (vista SQL com aritmética exacta) e o orçamento gerado (já arredondado).

**Severidade**: ALTA (em obras grandes).

---

### 🟠 ALTA 5 — Custos indiretos guardados como valor absoluto, não como percentagem

**Localização**: `useIcfBudget.ts` linhas 268, 283-288.

**Causa**: o dialog pede `custos_indiretos_percent`, mas é guardado como **valor absoluto** em `custos_indiretos.estaleiro` (`Math.round(subtotal * pct/100 * 100) / 100`). A `percent` é também guardada (em `indiretos_percent`) mas nem `Ver.tsx` nem o PDF a usam — apresentam o valor absoluto sem identificar a origem.

**Impacto**:
- Se o utilizador editar manualmente o subtotal depois, o "Estaleiro" não recalcula.
- Mistura semântica entre custos fixos manuais e custos derivados de %.
- Difícil distinguir orçamentos ICF de orçamentos manuais ao reabrir.

**Severidade**: ALTA.

---

### 🟡 MÉDIA 6 — `quantity_source = 'icf_parametric'` não consta na lista permitida

**Localização**: `useIcfBudget.ts:322`.

**Causa**: outros sítios do código usam `'manual'` ou `'parametric'`. O valor `'icf_parametric'` não tem CHECK constraint, mas pode quebrar filtros futuros que distinguem automatic vs manual.

**Severidade**: MÉDIA.

---

### 🟡 MÉDIA 7 — Sem audit log na geração de orçamento ICF

**Localização**: `useIcfBudget.ts` (toda a mutation).

**Causa**: existe a tabela `icf_audit_log` e o hook `useIcfAuditLog`, mas **não são chamados** ao gerar orçamento. Não fica registado quem gerou, com que parâmetros, em que momento.

**Severidade**: MÉDIA.

---

### 🟡 MÉDIA 8 — Estimativas implícitas sem transparência ao utilizador

**Localização**: `useIcfBudget.ts` linhas 99 (`/0.45` altura média sapata), 124-129 (densidade de painéis), 141 (35 kg/m³ aço paredes), 189-191 (abobadilhas, malha, treliças).

**Causa**: muitas constantes "mágicas" hard-coded sem possibilidade de override pelo utilizador nem documentação visível na UI.

**Impacto**: utilizador não compreende como se chegou a X painéis ou Y kg de aço. Não pode ajustar para a sua realidade (ex.: 50 kg/m³ em zona sísmica).

**Severidade**: MÉDIA.

---

### 🟡 MÉDIA 9 — `findPrice()` por keyword é frágil

**Localização**: `useIcfBudget.ts:49-64`.

**Causa**: pesquisa textual com `every(k => text.includes(k))`. Se a base de preços tiver "Betão C25/30 estrutural", a keyword `['betao']` faz match, mas escolhe o **primeiro** match — não distingue classe, finalidade nem fornecedor.

**Impacto**: pode usar preço de betão de limpeza para enchimento ICF, ou aço de cintas para malha sol.

**Severidade**: MÉDIA.

---

### 🟢 BAIXA 10 — Duplicação de orçamento no clique repetido

**Localização**: `Resumo.tsx:36-47`, `Index.tsx:54-65`.

**Causa**: o botão fica `disabled` durante `isPending`, mas se a mutation falhar o utilizador pode ressubmeter sem fechar o dialog → orçamento duplicado.

**Severidade**: BAIXA (mitigado por `disabled`, mas possível).

---

### 🟢 BAIXA 11 — Reabertura de orçamento ICF não detecta a origem

Ao reabrir um orçamento gerado pelo ICF, não há flag `source_module = 'icf'` nem `icf_configuracao_id` referência. Não é possível regenerar/reciclar o orçamento se a configuração ICF mudar.

**Severidade**: BAIXA (estrutural).

---

### 🟢 BAIXA 12 — `Math.ceil` em quantidades intermédias gera surplus invisível

`Math.ceil(qtdPaineis * 0.15)` para topos, `Math.ceil(comprimento * 0.2)` para cantos C3, etc. Cada arredondamento sobre arredondamento adiciona alguns euros. Não é necessariamente um bug (peças vendidas inteiras), mas o utilizador vê "12 cantos" sem saber que pediu 1.0 m de parede.

---

## D. Problemas de arquitetura

| # | Problema | Onde |
|---|---|---|
| D1 | **Lógica duplicada** de aplicação de margem em 3 sítios (useIcfBudget, Ver.tsx, orcamento-pdf.ts) | Falta `budgetTotalsService` único |
| D2 | **Sem camada de serviço** entre UI e Supabase para orçamentos | Hooks fazem inserts soltos |
| D3 | **Sem snapshot dos parâmetros ICF** que originaram o orçamento | Reabrir orçamento não permite reconciliar com config ICF |
| D4 | **Triggers SQL desligados** apesar das funções existirem | `update_capitulo_valor_total`, `update_orcamento_valor_total` |
| D5 | **Sem versionamento de itens** quando o orçamento é editado | Editar config ICF + regenerar substitui silenciosamente |
| D6 | **Sem validação server-side** dos limites (margem 0–99,99, IVA, qtd > 0) | Apenas validação no input HTML |
| D7 | **PDF é segunda fonte de verdade** (recalcula tudo) em vez de renderizar valores persistidos | Risco de divergência permanente |
| D8 | **Sem distinção de custo vs venda** nas tabelas — só `preco_unitario` + `preco_base` opcional | Não permite ocultar custo a perfis comerciais |

---

## E. Matriz de testes (estado atual vs esperado)

| # | Cenário | Input | Esperado | Atual | Status |
|---|---|---|---|---|---|
| T1 | Custo 100 €, margem 20% — preço artigo | 1 painel @ 100 € custo | 125,00 € | 156,25 € | ❌ **FALHA** |
| T2 | Subtotal artigos = soma dos `valor_total` na BD | 5 artigos × 100 € | 500 € em `orcamentos.valor_total` | 0 € | ❌ **FALHA** |
| T3 | UI Ver.tsx subtotal = PDF subtotal | qualquer orçamento ICF | iguais | iguais (ambos errados, ver T1) | ⚠️ |
| T4 | Listagem de orçamentos mostra valor correcto | orçamento ICF recém criado | valor real | 0 € | ❌ **FALHA** |
| T5 | Falha INSERT no meio → rollback | simular erro RLS no 3º artigo | nenhum dado parcial | capítulos órfãos | ❌ **FALHA** |
| T6 | Editar `preco_unitario` manualmente em artigo ICF | mudar 100 → 110 | preserva edição manual | preserva, mas Ver.tsx volta a aplicar margem | ❌ **FALHA** |
| T7 | Custos indiretos 8% recalculam ao mudar artigos | adicionar artigo de 1000 € | estaleiro sobe 80 € | fica fixo no valor inicial | ❌ **FALHA** |
| T8 | Configuração ICF → orçamento → reabrir → editar | regenerar preserva edições manuais | itens manuais mantidos | substitui tudo | ❌ **FALHA** (não testável, regenerar não existe) |
| T9 | Quantidades exactas nas 3 camadas (UI/BD/PDF) | 12.345 m² | 12.345 em todas | 12.345 (UI/PDF) / 12.345 (BD) ok | ✅ |
| T10 | Audit log regista geração | gerar orçamento | linha em `icf_audit_log` | nada | ❌ **FALHA** |

---

## F. Plano de implementação por fases

### **Fase 1 — Correções urgentes (1 sessão, baixo risco)**

**Objetivo**: parar os bugs críticos sem mexer em arquitetura.

Ficheiros alterados:
- `src/hooks/useIcfBudget.ts` — guardar `preco_unitario = custo` (sem aplicar margem) e enviar `valor_total = quantidade × custo`. A margem é aplicada **apenas** pela camada de leitura existente (Ver.tsx / PDF).
- Migração SQL — criar triggers `BEFORE INSERT/UPDATE` em `artigos_orcamento` para popular `valor_total` automaticamente, e `AFTER` para chamar `update_capitulo_valor_total` e `update_orcamento_valor_total`.

Comportamento preservado:
- Mesma UI, mesmo dialog, mesmas tabelas.
- Resumo financeiro do orçamento passa a mostrar valor correcto sem dupla margem.

Comportamento corrigido:
- T1, T2, T4, T7 deixam de falhar.

Riscos:
- Orçamentos ICF **antigos** já têm `preco_unitario` corrompido com margem aplicada. Necessário script SQL one-shot para reverter (`preco_unitario = preco_base` quando existe) — apresentar separadamente.

### **Fase 2 — Atomicidade e auditoria (1 sessão)**

- Criar Edge Function `generate-icf-budget` que faz toda a geração numa só RPC SQL transacional.
- Adicionar entradas em `icf_audit_log` (`evento = 'budget_generated'`).
- Adicionar `source_module` e `icf_configuracao_id` em `orcamentos` (campos opcionais).

### **Fase 3 — Snapshot e regeneração segura (2 sessões)**

- Tabela `icf_budget_snapshots` que guarda o JSON de `(config, panos, vaos, fundacoes, lajes, presets)` no momento da geração.
- Botão "Regenerar mantendo edições manuais" usando `quantity_source` para distinguir artigos automáticos (substituídos) de manuais (preservados).
- Versionamento via `numero_revisao` já existente em `orcamentos`.

### **Fase 4 — Transparência e configurabilidade (1 sessão)**

- Painel de "Pressupostos do cálculo" no dialog mostrando todas as constantes (35 kg/m³, 0.36 m²/painel, etc.) editáveis e guardadas em `icf_budget_presets`.
- Ligação directa a artigos do catálogo (`base_precos_personalizada.id`) em vez de keyword search.

### **Fase 5 — Axia explicativa (futuro)**

- Edge Function `axia-icf-budget-review`: recebe orçamento gerado, compara com histórico do utilizador, sinaliza anomalias (margem baixa, kg/m³ fora do esperado, falta de itens típicos).
- Camada **explicativa**, nunca substitui o motor determinístico.

---

## G. Esquema de tabelas / colunas a adicionar

```sql
-- Fase 1 (triggers em falta)
CREATE TRIGGER trg_artigos_calc_valor_total
  BEFORE INSERT OR UPDATE ON artigos_orcamento
  FOR EACH ROW EXECUTE FUNCTION (NEW.valor_total = NEW.quantidade * NEW.preco_unitario);

CREATE TRIGGER trg_artigos_sync_capitulo
  AFTER INSERT OR UPDATE OR DELETE ON artigos_orcamento
  FOR EACH ROW EXECUTE FUNCTION update_capitulo_valor_total();

CREATE TRIGGER trg_capitulos_sync_orcamento
  AFTER INSERT OR UPDATE OR DELETE ON capitulos_orcamento
  FOR EACH ROW EXECUTE FUNCTION update_orcamento_valor_total();

-- Fase 2
ALTER TABLE orcamentos
  ADD COLUMN source_module text DEFAULT 'manual',
  ADD COLUMN icf_configuracao_id uuid REFERENCES icf_configuracoes(id);

-- Fase 3
CREATE TABLE icf_budget_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid REFERENCES orcamentos(id) ON DELETE CASCADE,
  configuracao_id uuid REFERENCES icf_configuracoes(id),
  snapshot jsonb NOT NULL,
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz DEFAULT now()
);
```

---

## H. Recomendações para evitar inconsistências futuras

1. **Uma única função `applyMargin(custo, margem)`** importada em UI/PDF/serviço. Hoje vivem cópias inline em 3 ficheiros.
2. **Decidir se `preco_unitario` é custo ou venda** e respeitar essa convenção em **todo** o codebase (recomendo: `preco_base` = custo, `preco_unitario` = venda computada por trigger).
3. **PDF deve ler de `valor_total` persistido**, não recalcular. Fórmula só na génese do orçamento.
4. **Testes unitários** em `src/lib/margin.test.ts` para o cenário ICF (já existem para `calcPrecoVenda`, falta integração).
5. **Triggers SQL ligados** sempre que existirem funções de manutenção.
6. **Logs de auditoria** obrigatórios para qualquer geração automática (orçamento, RDO, etc.).

---

## Próximo passo proposto

Aprovar a **Fase 1** (correções urgentes + triggers + script de reparação dos orçamentos ICF antigos). É a intervenção mínima que repõe a coerência entre UI, BD e PDF. As fases seguintes ficam disponíveis para aprovação independente.
