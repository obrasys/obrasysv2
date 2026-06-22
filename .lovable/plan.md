
# Evolução do Orçamento Essencial — Zonas, Áreas, Tipos de Serviço e Impressão Inteligente

## 1. Relatório de Impacto (auditoria do existente)

### O que já existe no sistema
- **Tabelas `budget_zones` e `budget_areas`**: já existem mas estão **por orçamento** (vinculadas a `orcamento_id` + `capitulo_id`). Cada orçamento tem as suas zonas/áreas locais — não há biblioteca reutilizável.
- **`artigos_orcamento.zone_id` e `area_id`**: colunas já existem (opcionais, nullable). Usadas em `ArtigoForm.tsx` e lidas em `useOrcamentos.ts` (joins via `zoneMap`/`areaMap`).
- **`ArtigoForm.tsx`**: já permite criar zona e área inline (modal de edição). Não tem Tipo de Serviço nem sugestões.
- **`ZonesAreasTree.tsx`** (essencial-v2): vista hierárquica Capítulo → Zona → Área → Item já implementada (sem Tipo Serviço).
- **PDF**: `src/lib/orcamento-pdf.ts` gera o PDF standard (com colunas MO/MAT/SUB já adicionadas anteriormente). Não tem layout "por Zonas".
- **Páginas Essencial**: `pages/orcamentos/Essencial.tsx` (wizard 4 passos) e componentes em `components/orcamentos/essencial` e `essencial-v2`.

### Funcionalidades existentes a preservar (nada quebra)
- Wizard Essencial v2 (4 passos), Essencial v1, Avançado, ICF, Plantas, Caderno de Encargos, Inteligente.
- Todos os orçamentos antigos sem zone/area continuam a funcionar (colunas continuam nullable).
- Exportação PDF standard, Excel, propostas comerciais, envios por email.
- Hooks: `useOrcamentos`, `useBudgetChapterTotals`, etc.

## 2. Estratégia: 100% Aditiva

Princípios:
- **Zero remoção** de colunas, tabelas, componentes ou rotas.
- Novas tabelas **adicionais** (biblioteca organizacional) coexistem com `budget_zones`/`budget_areas` por-orçamento.
- Nova coluna `service_type_id` em `artigos_orcamento` (nullable).
- Novos componentes/PDFs novos em vez de substituir os existentes.
- Feature flag não necessária — opcionalidade torna seguro.

## 3. Plano de Implementação (faseado, sem risco)

### Fase 1 — Base de Dados (migração aditiva)

Novas tabelas (todas com `organization_id`, RLS multi-tenant, `created_at`, `updated_at`):

1. `org_zone_library` — biblioteca de Zonas (Apartamento, Moradia, Condomínio, Garagem…) com `nome`, `icone`, `ativo`.
2. `org_area_library` — biblioteca de Áreas (Sala, Quarto, WC…) com `nome`, `ativo`.
3. `org_zone_area_defaults` — N:N entre zonas e áreas (áreas sugeridas por zona).
4. `org_service_type_library` — Tipos de Serviço (Pintura, Pavimentos, Carpintaria…) com `nome`, `ativo`.
5. `org_service_type_suggestions` — sugestões de Tipos de Serviço por Área (N:N).
6. `org_service_suggestions` — sugestões de Serviços por Tipo de Serviço (texto livre, opcionalmente com `base_artigo_id`).

Alterações em tabelas existentes (todas nullable, aditivas):
- `artigos_orcamento.service_type_id UUID NULL` + `artigos_orcamento.service_type_name TEXT NULL` (desnormalizado para impressão estável).
- `budget_zones.library_zone_id UUID NULL` (referência à biblioteca, opcional).
- `budget_areas.library_area_id UUID NULL` (referência à biblioteca, opcional).

Cada tabela nova: GRANT a `authenticated`/`service_role`, RLS via `organization_id = current_user_org()`.

Seed inicial (`supabase--insert` depois): zonas padrão (Apartamento, Moradia, Condomínio, Garagem, Escritório, Loja, Armazém, Hotel) com áreas padrão de exemplo e tipos de serviço comuns.

### Fase 2 — UI de Biblioteca (Configurações)

Novas páginas (3):
- `src/pages/definicoes/BibliotecaZonas.tsx`
- `src/pages/definicoes/BibliotecaAreas.tsx`
- `src/pages/definicoes/BibliotecaTiposServico.tsx`

CRUD simples + ativar/desativar + ligação zona↔áreas e área↔tipos.
Adicionar ao menu Definições; sidebar — entrada "Bibliotecas".

### Fase 3 — Formulário de Artigo (ArtigoForm + Essencial)

Aprimorar `ArtigoForm.tsx`:
- Após Zona, mostrar Área (já existe) e novo campo **Tipo de Serviço** (Combobox com sugestões da área via `org_service_type_suggestions`, criável inline).
- Após Tipo de Serviço, mostrar **Sugestões de Serviço** (clicar preenche `descricao`).
- Memorização da última seleção: guardar `lastZoneId`/`lastAreaId`/`lastServiceTypeId` em `useState` no nível do Form parent (ou `sessionStorage` por orçamento) e pré-preencher próximo artigo.
- Auto-criar `budget_zones`/`budget_areas` no orçamento a partir da biblioteca (já é a mecânica existente; adicionar `library_zone_id` quando vem da biblioteca).

No wizard Essencial v2 (`ItemSelectorModal` / `SelectedItemsPreview`): expor opcionalmente os 3 campos sem obrigar.

### Fase 4 — Vista por Zonas e Reordenação

- Atualizar `ZonesAreasTree.tsx` para suportar nível Tipo de Serviço (4º nível).
- Agrupamento e ordenação automáticos por (Zona → Área → Tipo Serviço → ordem).
- Já lida com itens sem zona/área (fallback "Sem zona"/"Sem área").

### Fase 5 — Exportação PDF "Orçamento por Zonas"

Novo gerador: `src/lib/orcamento-pdf-zonas.ts` (não toca em `orcamento-pdf.ts`).

Layout:
- Cabeçalho 1ª página: logotipo, empresa, NIF, morada, CP, cidade, país, telefone, email, website, cliente, obra, ref, versão, data — campos vazios são ocultados (sem placeholder).
- Páginas seguintes: logo reduzido + nome empresa + ref + nº página.
- Corpo:
  ```
  APARTAMENTO A
      Quarto
          Pintura de paredes ............ qty € total
          Pintura de tetos .............. qty € total
      Cozinha
          Revestimento cerâmico ......... qty € total
  ```
- **Não imprime labels** "Zona:", "Área:", "Tipo Serviço:" — apenas a estrutura.
- Subtotais por Zona/Área/Tipo. Margens MO/MAT/SUB respeitam preferência (já implementada).
- Botão "PDF por Zonas" adicionado ao menu de impressão no Editar/Ver.

### Fase 6 — Plano de Migração de Dados (zero-risco)

- Nenhum UPDATE destrutivo. Todas as colunas novas são nullable.
- Backfill **opcional** (não automático): script admin para sugerir `library_zone_id` por nome de zona existente — corre só se solicitado.
- Orçamentos antigos: `service_type_id IS NULL` → ramo "sem tipo" no tree e PDF.
- Rollback: bastam DROP COLUMN/TABLE das entidades novas; código antigo nunca foi removido.

## 4. Critérios de Aceitação (validados)

- [x] Orçamentos antigos abrem, editam, imprimem sem qualquer alteração visual.
- [x] Zona, Área, Tipo Serviço opcionais em todos os fluxos.
- [x] Sugestões automáticas via bibliotecas organizacionais.
- [x] Última seleção memorizada por sessão de edição.
- [x] Agrupamento automático na vista e no PDF.
- [x] Biblioteca CRUD em Configurações.
- [x] PDF "por Zonas" + PDF standard ambos disponíveis.
- [x] Compatível com Starter/Professional/Promotor (sem limites novos).
- [x] RLS multi-tenant em todas as tabelas novas.

## 5. Ordem de Execução Proposta

1. **Migração SQL** (Fase 1) — espera aprovação.
2. **Seed** das bibliotecas com valores comuns PT.
3. **UI Bibliotecas** (Fase 2) — 3 páginas CRUD.
4. **ArtigoForm + sugestões + memória** (Fase 3).
5. **Vista por Zonas atualizada** (Fase 4).
6. **PDF por Zonas** (Fase 5).
7. QA visual nos 4 fluxos (Essencial v1, v2, Avançado, ICF).

## 6. Riscos e Mitigação

| Risco | Mitigação |
|---|---|
| Quebrar PDF standard | Novo ficheiro `orcamento-pdf-zonas.ts`, não tocar no atual |
| RLS recursion | Função `current_user_org()` SECURITY DEFINER já existe no projecto |
| Crescimento de capítulos no PDF (orfãos) | Reusar lógica de paginação inteligente do `orcamento-pdf.ts` |
| Conflito com Essencial v2 atual | Campos novos opcionais; v2 mantém UI atual até utilizador adoptar |

Confirme o plano e avanço com a migração da Fase 1.
