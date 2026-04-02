

# Medição Assistida por Planta e Infraestrutura Preliminar com Axia
## Especificação Funcional e Técnica — Documentação Interna v1.0

---

## 1. Visão Técnica do Módulo

O módulo transforma ficheiros de planta (PDF/imagem) em quantitativos orçamentáveis através de três camadas de dados com rastreabilidade distinta:

- **Camada 1 — Geometria Observada**: medições manuais e assistidas por calibração (linhas, áreas, contagens), já parcialmente implementada com `plan_measurements`, `plan_calibrations` e o visualizador `react-konva`.
- **Camada 2 — Recomendação Inferida**: sugestões Axia (cotas OCR, compartimentos, elementos estruturais via `axia-plan-vision`) e cenários preliminares de infraestrutura/fundações — sempre marcados como `origem: 'ia_inferida'` e sujeitos a validação humana.
- **Camada 3 — Quantitativo Paramétrico**: conversão de parâmetros validados em artigos orçamentais via regras paramétricas (`parametric_rules`, `execute_parametric_rule_v2`), já operacional para elementos construtivos.

A arquitetura existente cobre ~60% do MVP. As lacunas principais são: marcação semântica de compartimentos/paredes/vãos, camada de infraestrutura preliminar, consolidação do fluxo ponta-a-ponta planta→orçamento, e enriquecimento das sugestões Axia.

---

## 2. Objetivo de Negócio e Proposta de Valor

| Público-alvo | Problema | Valor entregue |
|---|---|---|
| Orçamentista PME | Medir manualmente plantas impressas, erros de transcrição | Medição digital com escala calibrada, quantitativos diretos |
| Gestor de obra / Remodelação | Não sabe que fundações orçamentar sem projeto estrutural | Cenários preliminares parametrizáveis para orçamento |
| Comercial | Demora 2-3 dias a produzir orçamento de remodelação | Pré-orçamento em horas, com rastreabilidade planta→artigo |

**Métrica-chave**: tempo médio entre upload de planta e geração de pré-orçamento < 45 min para uma planta de apartamento T2.

---

## 3. Escopo

### MVP (implementar agora)
- [EXISTE] Upload PDF/imagem, versionamento por `revision_number`
- [EXISTE] Calibração manual de escala (2 pontos + distância real)
- [EXISTE] Medição de linha, área e contagem com `react-konva`
- [EXISTE] Mapeamento medição→artigo base de preços (`plan_measurement_mappings`)
- [EXISTE] Geração de pré-orçamento (`PlanBudgetGenerator`)
- [EXISTE] Análise visual Axia (`axia-plan-vision`) e sugestões (`axia-plan-suggestions`)
- **[NOVO]** Marcação semântica de compartimentos (nome, tipo, limites)
- **[NOVO]** Marcação de paredes com espessura e tipo funcional
- **[NOVO]** Marcação de vãos (portas/janelas) com dimensões
- **[NOVO]** Mapa de quantitativos consolidado por compartimento
- **[NOVO]** Revisão manual assistida com estados de validação por medição
- **[NOVO]** Cálculo automático de perímetro a partir de polígonos de área

### MVP Secundário
- Camada de infraestrutura preliminar (ativação opcional por obra)
- Cenários de fundação com parâmetros do solo (tipo, capacidade portante)
- Regras paramétricas de infraestrutura (sapatas, lintéis, vigas, lajes térreo)
- Geração automática de capítulo orçamental "Fundações e Infraestrutura"
- Axia: sugestão de alternativas de fundação com base no tipo de solo e área

### Pós-MVP
- Medição assistida por IA: auto-deteção de paredes e vãos a partir da imagem
- Conversão de cotas OCR em medições confirmáveis com um clique
- Templates de compartimento (cozinha tipo → artigos pré-associados)
- Comparação entre revisões da mesma planta (diff visual)

### Futuro Estratégico
- Importação DWG com extração de layers
- Importação IFC (BIM) com mapeamento automático
- Integração com fornecedores para preços em tempo real por zona geográfica

---

## 4. Arquitetura Funcional por Etapas

```text
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO PRINCIPAL                                                 │
│                                                                   │
│  1. Upload     2. Calibração   3. Medição      4. Mapeamento     │
│  PDF/Imagem →  2 pontos +   →  Linhas, Áreas →  Medição →       │
│  plan_imports   distância       Contagens        Artigo base     │
│                plan_calibrations plan_measurements  plan_measurement_mappings │
│                                                                   │
│  5. Compartimentos  6. Revisão       7. Pré-Orçamento            │
│  Nome + Limites  →  Validação     →  Consolidar →                │
│  plan_rooms          humana           Gerar orçamento             │
│                      obrigatória      plan_budget_links           │
│                                                                   │
│  ─── CAMADA OPCIONAL (MVP Secundário) ──────────────────────     │
│  8. Infraestrutura  9. Parametrização  10. Cap. Fundações        │
│  Tipo solo +     →  Solução escolhida → Artigos paramétricos     │
│  cenários Axia       + parâmetros        plan_infra_items         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Estrutura de Telas e Experiência do Utilizador

### Tela 1 — Lista de Plantas (EXISTE: `plantas/Index.tsx`)
- Grid de cards por obra, com badge de status e disciplina

### Tela 2 — Detalhe da Planta (EXISTE: `plantas/Detail.tsx`)
Evolução proposta:
- **Painel esquerdo**: Visualizador `react-konva` com ferramentas (já existe)
- **Painel direito** (tabs):
  - `Medições` — lista existente + novo agrupamento por compartimento
  - `Compartimentos` — **NOVO**: lista de rooms com área calculada
  - `Axia™ Análise` — painel existente de análise visual
- **Barra inferior contextual** — resumo: X medições, Y m², Z compartimentos

### Tela 3 — Quantitativos e Mapeamento (EXISTE: `plantas/Quantitativos.tsx`)
Evolução proposta:
- Tab `Por Compartimento` — quantitativos agrupados por room
- Tab `Mapa Geral` — visão consolidada (existe parcialmente)
- Tab `Infraestrutura` — **NOVO (MVP2)**: itens de fundação parametrizados

### Tela 4 — Infraestrutura Preliminar (MVP Secundário)
- Activada por toggle na obra
- Formulário de condições do solo (tipo, capacidade, nível freático)
- Axia apresenta 2-3 cenários com explicação
- Utilizador seleciona, ajusta parâmetros, gera capítulo orçamental

---

## 6. Entidades e Tabelas

### Existentes (sem alteração estrutural)
| Tabela | Descrição |
|---|---|
| `plan_imports` | Ficheiros de planta por obra |
| `plan_calibrations` | Calibração de escala por planta |
| `plan_measurements` | Medições geométricas |
| `plan_measurement_mappings` | Associação medição→artigo |
| `plan_budget_links` | Ligação medição→artigo do orçamento gerado |

### Novas — MVP

| Tabela | Descrição |
|---|---|
| `plan_rooms` | Compartimentos marcados na planta |
| `plan_room_measurements` | Ligação N:N entre rooms e measurements |
| `plan_walls` | Paredes com tipo funcional e espessura |
| `plan_openings` | Vãos (portas/janelas) associados a paredes |

### Novas — MVP Secundário

| Tabela | Descrição |
|---|---|
| `plan_site_conditions` | Condições do terreno por obra |
| `plan_infra_scenarios` | Cenários de infraestrutura gerados pela Axia |
| `plan_infra_items` | Itens paramétricos do cenário selecionado |
| `plan_infra_budget_links` | Ligação infra→artigo do orçamento |

---

## 7. Campos Principais por Entidade

### `plan_rooms` (NOVO)
```
id uuid PK
plan_import_id uuid FK → plan_imports
user_id uuid FK
nome text — "Sala", "Cozinha", "WC1"
tipo_compartimento text — 'habitacao', 'servico', 'circulacao', 'tecnico'
boundary_coords jsonb — Array<{x,y}> polígono no canvas
area_m2 numeric — calculado via Shoelace
perimetro_m numeric — calculado
pe_direito_m numeric DEFAULT 2.70
observacao text
estado_validacao text DEFAULT 'pendente' — 'pendente'|'validado'|'rejeitado'
origem text DEFAULT 'manual' — 'manual'|'ia_inferida'
created_at timestamptz
updated_at timestamptz
```

### `plan_room_measurements` (NOVO)
```
id uuid PK
room_id uuid FK → plan_rooms
measurement_id uuid FK → plan_measurements
created_at timestamptz
UNIQUE(room_id, measurement_id)
```

### `plan_walls` (NOVO)
```
id uuid PK
plan_import_id uuid FK → plan_imports
user_id uuid FK
room_id uuid FK → plan_rooms (nullable, parede pode ser entre rooms)
start_point jsonb — {x,y}
end_point jsonb — {x,y}
comprimento_m numeric
espessura_cm numeric DEFAULT 15
tipo_funcional text — 'exterior','interior_divisoria','interior_estrutural'
material text — 'alvenaria','betao','gesso_cartonado','outro'
observacao text
origem text DEFAULT 'manual'
created_at timestamptz
updated_at timestamptz
```

### `plan_openings` (NOVO)
```
id uuid PK
wall_id uuid FK → plan_walls
user_id uuid FK
tipo text — 'porta','janela','portada','claraboia'
largura_m numeric
altura_m numeric
peitoril_m numeric (janelas)
posicao_na_parede jsonb — {x,y}
observacao text
origem text DEFAULT 'manual'
created_at timestamptz
updated_at timestamptz
```

### `plan_site_conditions` (MVP Secundário)
```
id uuid PK
obra_id uuid FK → obras
user_id uuid FK
tipo_solo text — 'arenoso','argiloso','rochoso','aterro','misto'
capacidade_portante_kpa numeric
nivel_freatico_m numeric
zona_sismica text — 'A','B','C','D'
topografia text — 'plano','inclinado','acentuado'
area_implantacao_m2 numeric
numero_pisos integer DEFAULT 1
observacoes text
created_at timestamptz
updated_at timestamptz
```

### `plan_infra_scenarios` (MVP Secundário)
```
id uuid PK
site_condition_id uuid FK → plan_site_conditions
user_id uuid FK
nome text — "Cenário A: Sapatas Isoladas"
tipo_fundacao text — 'sapatas_isoladas','sapata_corrida','ensoleiramento','estacas'
descricao text
parametros jsonb — {dimensoes, armaduras, betao_classe, etc.}
custo_estimado numeric
selecionado boolean DEFAULT false
axia_confidence numeric — 0.0 a 1.0
axia_reasoning text — explicação da recomendação
created_at timestamptz
updated_at timestamptz
```

### `plan_infra_items` (MVP Secundário)
```
id uuid PK
scenario_id uuid FK → plan_infra_scenarios
artigo_base_id uuid FK → base_precos_personalizada (nullable)
descricao text
unidade text
quantidade numeric
preco_unitario numeric
valor_total numeric
formula_origem text — ex: "area_implantacao * 0.12 * 1.05"
created_at timestamptz
```

---

## 8. Relações entre Entidades

```text
obras ─1:N─► plan_imports ─1:N─► plan_measurements ─1:N─► plan_measurement_mappings
                │                        │                          │
                ├─1:N─► plan_calibrations │                          └──► plan_budget_links
                │                        │
                ├─1:N─► plan_rooms ◄─N:N─┘ (via plan_room_measurements)
                │            │
                └─1:N─► plan_walls ─1:N─► plan_openings
                
obras ─1:1─► plan_site_conditions ─1:N─► plan_infra_scenarios ─1:N─► plan_infra_items
                                                    │
                                                    └──► plan_infra_budget_links ──► artigos_orcamento
```

---

## 9. Regras de Negócio

### Calibração
- R1: Sem calibração válida, medições ficam em pixels (sem unidade real)
- R2: Recalibrar invalida todas as medições existentes e força revisão

### Medições
- R3: `valor_bruto` é imutável após criação (geometria pura)
- R4: `valor_ajustado` é editável pelo utilizador (ex: deduzir vãos)
- R5: `valor_final` = `valor_ajustado * fator_desperdicio * coeficiente` (do mapping)
- R6: Toda medição com `origem = 'ia_inferida'` requer `estado_validacao = 'validado'` antes de entrar no orçamento

### Compartimentos
- R7: Um compartimento é um polígono fechado com nome obrigatório
- R8: Medições podem pertencer a 0 ou mais compartimentos
- R9: Pé-direito assume 2.70m por defeito, editável por room

### Infraestrutura (MVP2)
- R10: A camada de infraestrutura é opt-in por obra
- R11: Cenários Axia são sempre preliminares — banner permanente: "Estimativa para orçamento. Não substitui projeto de estruturas."
- R12: Só o cenário `selecionado = true` gera capítulo orçamental
- R13: Parâmetros do cenário são editáveis manualmente após seleção

### Orçamento
- R14: Geração de pré-orçamento exige ≥1 medição com mapping válido
- R15: `plan_budget_links` garante rastreabilidade bidirecional planta↔orçamento
- R16: Itens de infraestrutura geram um capítulo separado "Fundações e Infraestrutura"

---

## 10. Permissões e Segurança por Perfil

| Ação | Admin | Gestor | Fiscal | Financeiro | Cliente |
|---|---|---|---|---|---|
| Upload planta | ✓ | ✓ | ✓ | ✗ | ✗ |
| Calibrar | ✓ | ✓ | ✓ | ✗ | ✗ |
| Medir | ✓ | ✓ | ✓ | ✗ | ✗ |
| Validar medições | ✓ | ✓ | ✗ | ✗ | ✗ |
| Gerar pré-orçamento | ✓ | ✓ | ✗ | ✗ | ✗ |
| Ver quantitativos | ✓ | ✓ | ✓ | ✓ | ✗ |
| Infraestrutura (ativar) | ✓ | ✓ | ✗ | ✗ | ✗ |

**RLS**: Todas as novas tabelas usam `user_id = ANY(public.get_org_member_ids())` para visibilidade organizacional, seguindo o padrão existente.

---

## 11. Serviços Backend, Jobs e Automações

| Serviço | Tipo | Descrição |
|---|---|---|
| `axia-plan-vision` | Edge Function (EXISTE) | Análise visual com Gemini Flash |
| `axia-plan-suggestions` | Edge Function (EXISTE) | Sugestões contextuais sobre medições |
| `axia-infra-scenarios` | Edge Function (NOVO — MVP2) | Gera cenários de fundação com base em condições do solo + área |
| Trigger `recalc_room_area` | DB Trigger (NOVO) | Recalcula `area_m2` e `perimetro_m` quando `boundary_coords` muda |
| Trigger `invalidate_on_recalibration` | DB Trigger (NOVO) | Marca medições como `pendente` quando calibração muda |

---

## 12. Papel da Axia Neste Módulo

A Axia opera em quatro pontos de contacto, sempre com explicação e confiança:

1. **Análise Visual** (existe): deteta cotas, compartimentos e elementos via Gemini Flash. Resultados são sugestões não-vinculativas no painel lateral.

2. **Sugestões de Medição** (existe): após medições manuais, sugere artigos complementares, deteta duplicações e incoerências de unidade.

3. **Cenários de Infraestrutura** (MVP2): dado tipo de solo + área + nº pisos, apresenta 2-3 alternativas de fundação com `axia_reasoning` explicando a recomendação. Nunca seleciona automaticamente.

4. **Validação Cruzada** (pós-MVP): compara quantitativos da planta com orçamentos históricos similares para alertar desvios anómalos (ex: "área de pavimento 40% superior à média para T2").

**Guardrails Axia neste módulo**:
- Nunca altera medições automaticamente
- Nunca marca como validado sem acção humana
- Nunca apresenta cenário de infraestrutura como cálculo definitivo
- Sempre inclui `confidence` e `reasoning` nas respostas
- Dados inferidos são persistidos com `origem = 'ia_inferida'`

---

## 13. Regra Fixa vs Inferência por IA

| Funcionalidade | Tipo | Justificação |
|---|---|---|
| Cálculo de área (Shoelace) | **Regra fixa** | Geometria determinística |
| Cálculo de perímetro | **Regra fixa** | Soma de segmentos |
| pixels→metros via calibração | **Regra fixa** | Proporcionalidade linear |
| Fator de desperdício | **Regra fixa** | Coeficiente configurável |
| Deteção de cotas na imagem | **Inferência IA** | OCR com incerteza |
| Identificação de compartimentos | **Inferência IA** | Interpretação visual |
| Cenários de fundação | **Inferência IA** | Múltiplas variáveis, requer validação |
| Sugestão de artigos complementares | **Inferência IA** | Contexto semântico |
| Quantificação paramétrica (fórmulas) | **Regra fixa** | `execute_parametric_rule_v2` já existente |

---

## 14. Riscos Técnicos e Trade-offs

| Risco | Impacto | Mitigação |
|---|---|---|
| Precisão OCR de cotas em plantas escaneadas | Medições erradas propagam-se ao orçamento | Toda inferência IA requer validação humana; badge "IA" visível |
| Performance do canvas com >100 medições | UI lenta no `react-konva` | Virtualização de camadas; render apenas medições visíveis no viewport |
| Complexidade da camada de infraestrutura | Scope creep no MVP | Separação estrita em MVP Secundário; feature flag por obra |
| Recalibração invalida medições | Utilizador perde trabalho | Confirmação modal com impacto quantificado ("12 medições serão invalidadas") |
| Gemini Flash pode retornar JSON malformado | Crash na análise | Schema validation com fallback gracioso; retry com prompt simplificado |
| Multi-page PDF com calibrações diferentes por página | Calibração por planta vs por página | MVP: calibração por planta (mesma escala). Evolução: calibração por página |

**Trade-off principal**: o MVP não tenta detetar automaticamente paredes/vãos — o utilizador marca manualmente. Isto reduz o "wow factor" mas garante fiabilidade e evita falsas expectativas. A deteção automática entra como assistência opcional no pós-MVP.

---

## 15. Ordem Recomendada de Implementação

### Fase 1 — Consolidar Base (1-2 sprints)
1. Migração DB: criar `plan_rooms`, `plan_room_measurements`, `plan_walls`, `plan_openings`
2. RLS para novas tabelas
3. Hooks CRUD: `usePlanRooms`, `usePlanWalls`, `usePlanOpenings`
4. Trigger de recálculo de área/perímetro em rooms

### Fase 2 — UI de Compartimentos e Paredes (1-2 sprints)
5. Ferramenta de desenho de compartimento no canvas (polígono nomeável)
6. Ferramenta de marcação de parede (linha com espessura)
7. Ferramenta de marcação de vão sobre parede
8. Associação medição↔compartimento na lista de medições

### Fase 3 — Quantitativos Consolidados (1 sprint)
9. Vista "por compartimento" na página de Quantitativos
10. Cálculo automático de perímetro a partir de polígonos
11. Mapa de quantitativos exportável (tabela consolidada)
12. Revisão com estados de validação bulk

### Fase 4 — Infraestrutura Preliminar (2 sprints) — MVP Secundário
13. Migração DB: `plan_site_conditions`, `plan_infra_scenarios`, `plan_infra_items`
14. Edge Function `axia-infra-scenarios`
15. UI de condições do solo + cenários
16. Geração de capítulo orçamental de fundações

### Fase 5 — Enriquecimento Axia (1 sprint)
17. Conversão de cotas OCR em medições pendentes de validação
18. Validação cruzada com orçamentos históricos
19. Templates de compartimento

---

## 16. Critérios de Aceitação do MVP

| # | Critério | Verificação |
|---|---|---|
| CA1 | Upload de PDF/imagem cria registo versionado em `plan_imports` | Upload 2 versões da mesma planta → `revision_number` incrementa |
| CA2 | Calibração com 2 pontos calcula `pixels_per_meter` correto | Calibrar com cota conhecida de 5m → medir mesma distância = 5.00m ±2% |
| CA3 | Medição de linha retorna comprimento em metros | Desenhar linha sobre cota conhecida → valor correto |
| CA4 | Medição de área retorna m² via Shoelace | Desenhar retângulo 3×4m calibrado → 12.00 m² ±3% |
| CA5 | Compartimento criado com polígono calcula área e perímetro | Criar room "Sala" → `area_m2` e `perimetro_m` preenchidos |
| CA6 | Parede criada com espessura e tipo funcional | Marcar parede exterior 20cm → dados persistidos |
| CA7 | Vão associado a parede com dimensões | Marcar porta 0.80×2.10m na parede → persistido |
| CA8 | Mapeamento medição→artigo com fator de desperdício | Associar medição de 10m² a artigo → `valor_final` = 10 × 1.05 = 10.50 |
| CA9 | Geração de pré-orçamento cria capítulos e artigos | Gerar → orçamento criado com `plan_budget_links` rastreáveis |
| CA10 | Medição de origem IA não entra no orçamento sem validação | Inferência Axia com `estado = 'pendente'` → excluída da geração |
| CA11 | Recalibração invalida medições com confirmação | Recalibrar → modal de confirmação → medições voltam a `pendente` |
| CA12 | Dados visíveis para toda a organização (RLS org) | User B da mesma empresa vê plantas criadas por User A |
| CA13 | Quantitativos agrupáveis por compartimento | Vista por room mostra subtotais corretos |
| CA14 | Axia analisa planta e retorna sugestões no painel lateral | Clicar "Analisar com IA" → resultados com confiança exibidos |

