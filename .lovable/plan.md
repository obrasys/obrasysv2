

# Modulo "Instalacoes" - Plano de Implementacao

Este e um modulo grande que sera implementado em fases. O sistema atual usa `user_id` para isolamento de dados (e nao `company_id`), por isso todas as tabelas seguirao esse padrao.

---

## Fase 1: Base de Dados (6 tabelas + RLS)

### Tabelas a criar

**1. `installations_packages`** - Pacotes parametricos por obra/especialidade
- id, user_id, obra_id, specialty (electrical/plumbing/telecom), profile (eco/med/premium), complexity (simple/normal/complex), typology, area_m2, bathrooms, bedrooms, kitchen_count, extra_rooms, has_laundry, points_estimated, points_final, linear_m_estimated, linear_m_final, total_cost_estimated, progress_percent, status (draft/sent/active), created_at, updated_at

**2. `installations_coefficients`** - Coeficientes parametricos editaveis por empresa
- id, user_id, specialty, coefficient_key, value_numeric, description, created_at, updated_at
- Sera pre-populada com os defaults definidos (ex: `electrical.socket_factor = 0.35`, `electrical.lighting_factor = 0.18`, etc.)

**3. `installations_catalog_items`** - Biblioteca de itens padrao por especialidade
- id, user_id, specialty, profile, name, unit, base_qty_type (points/linear/fixed), cost_material, cost_labor, margin_percent, is_active, is_system, created_at, updated_at

**4. `installations_package_items`** - Itens gerados para cada pacote
- id, package_id, catalog_item_id, name, unit, qty, unit_cost_material, unit_cost_labor, margin_percent, total_cost, manually_adjusted, created_at

**5. `installations_links`** - Vinculos com orcamentos e cronograma
- id, package_id, user_id, budget_id, budget_item_ids (jsonb), schedule_task_ids (jsonb), created_at

**6. `installations_logs`** - Historico de alteracoes
- id, user_id, package_id, action, field_changed, old_value, new_value, created_at

### RLS
Todas as tabelas com `user_id = auth.uid()` para SELECT/INSERT/UPDATE/DELETE, seguindo o padrao existente no projeto. Itens de catalogo com `is_system = true` visiveis para todos os autenticados.

---

## Fase 2: Tipos TypeScript e Motor de Calculo

### Ficheiros novos
- `src/types/instalacoes.ts` - Todos os tipos, enums e constantes
- `src/lib/installations-engine.ts` - Logica pura de calculo parametrico (sem dependencias de DB)
  - Funcoes: `calculateElectricalPoints()`, `calculatePlumbingPoints()`, `calculateTelecomPoints()`
  - Aplica multiplicadores de perfil e complexidade
  - Retorna pontos, metros lineares e lista de itens estimados

---

## Fase 3: Hook Principal

### `src/hooks/useInstalacoes.ts`
- CRUD de pacotes (`installations_packages`)
- Leitura/escrita de coeficientes (`installations_coefficients`)
- Catalogo de itens
- Geracao de itens do pacote (usa o motor de calculo)
- Envio para orcamento (cria capitulo + artigos no orcamento da obra)
- Leitura de progresso

---

## Fase 4: Componentes UI

### Estrutura de ficheiros
```text
src/components/instalacoes/
  InstallationsDashboard.tsx    -- Cards resumo + tabela pacotes ativos
  PackageForm.tsx               -- Formulario tipologia/area/divisoes/perfil/complexidade
  EstimativasCard.tsx           -- Pontos e metros (auto-calculo + override manual)
  PreviaOrcamentoCard.tsx       -- Lista itens + totais
  SpecialtyPage.tsx             -- Pagina reutilizavel por especialidade
  CoefficientsEditor.tsx        -- Edicao de coeficientes da empresa
  CatalogManager.tsx            -- Gestao do catalogo de itens
  InstallationsProgressCard.tsx -- Progresso por especialidade
  index.ts
```

### Paginas
```text
src/pages/instalacoes/
  Index.tsx       -- Visao Geral (dashboard)
  Eletrica.tsx    -- Especialidade Eletrica
  Canalizacao.tsx -- Especialidade Canalizacao
  Telecom.tsx     -- Especialidade Telecom
  Configurar.tsx  -- Coeficientes + Catalogo
```

---

## Fase 5: Navegacao e Rotas

- Adicionar "Instalacoes" ao menu lateral (`src/config/navigation.ts`) com icone `Plug`
- Adicionar rotas em `src/App.tsx`:
  - `/instalacoes` - Dashboard
  - `/instalacoes/eletrica` - Eletrica (com filtro por obra)
  - `/instalacoes/canalizacao` - Canalizacao
  - `/instalacoes/telecom` - Telecom
  - `/instalacoes/configurar` - Configuracao

---

## Fase 6: Integracoes

### Com Orcamentos
- Botao "Enviar para Orcamento" cria/atualiza capitulo "Instalacoes - [Especialidade] - [Perfil]" no orcamento da obra
- Mantido vinculo via `installations_links`

### Com Cronograma
- Ao criar pacote, sugerir criacao de tarefas padrao no cronograma (3 etapas)
- Vinculo guardado em `installations_links.schedule_task_ids`

### Com RDO
- Usar o sistema de RDO existente, adicionando filtro por especialidade na UI
- Dentro da pagina de especialidade, mostrar historico de RDOs da obra com link para criar novo

---

## Dados Iniciais (Seed)

Inserir coeficientes default e itens de catalogo (is_system=true) com os valores especificados:
- Eletrica: socket_factor=0.35, lighting_factor=0.18, kitchen_extra_sockets=6, etc.
- Canalizacao: wc_water_points=6, kitchen_water_points=4, etc.
- Telecom: living_room_rj45=2, bedroom_rj45=1, etc.
- Catalogo: ~15 itens padrao com precos de referencia por perfil

---

## Fluxo do Utilizador

1. Vai a "Instalacoes" no menu
2. Seleciona obra e especialidade
3. Preenche 6 campos (tipologia, area, WCs, quartos, perfil, complexidade)
4. Sistema calcula automaticamente pontos, metros e custos
5. Utilizador pode ajustar manualmente (com alerta visual)
6. Clica "Enviar para Orcamento" para gerar itens no orcamento oficial
7. Acompanha progresso na visao geral

---

## Notas Tecnicas

- **RLS**: Segue padrao `user_id = auth.uid()` (nao `company_id`, que nao existe no sistema)
- **Roles do pedido original (admin/manager/staff)**: O sistema atual nao tem roles granulares por empresa. Sera implementado com o role existente no perfil (`admin`/`gestor`/`fiscal`/`cliente`). Clientes no portal continuam sem ver custos/margens.
- **PDF interno**: Reutiliza o padrao existente com jsPDF
- **Validacoes**: area > 0, arredondamentos para inteiros, logs de alteracoes manuais

