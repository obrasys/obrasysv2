# MCE — Mapa Comparativo Económico

Submódulo de **Obra > Compras e Contratações**, fiel à estrutura do Excel "Mod.03-1 — Comparativo Tipo TORRES" (já analisado), com ligação a Orçamento, Budget Objetivo, Fornecedores, Contratos e Financeiro.

Dado o âmbito (8 tabelas novas, ~6 ecrãs, integrações com 5 módulos, Axia, exportação PDF/Excel, workflow de aprovação multi-nível), proponho **implementação em 4 fases**. Cada fase entrega valor utilizável antes da seguinte.

---

## Fase 1 — Fundação + Folha MCE editável (MVP)

**Objetivo:** criar, editar e visualizar um MCE completo numa folha tipo Excel, com cálculos corretos.

### Base de dados (uma migração)
- Tabelas: `mce_maps`, `mce_suppliers`, `mce_items`, `mce_supplier_item_prices`, `mce_attachments`
- Multi-tenant `organization_id` + RLS via `has_obra_access()` (SECURITY DEFINER, evita recursão)
- Triggers de `updated_at` e auditoria em `axia_audit_log`
- GRANTs explícitos para `authenticated` + `service_role`
- Bucket privado `mce-attachments` com policy por organização

### UI — Folha MCE (layout único fiel ao Excel)
Rota `/obras/:obraId/compras/mce` (lista) e `/obras/:obraId/compras/mce/:mceId` (folha).

Estrutura visual replicada do Excel:
- **Topo:** MCE | Nº Obra | Lote | Gestor Projeto | Nº MCE | Datas (Fornecimento / Contrato / Comparativo)
- **Subtítulo:** Nome da Obra | Local | Referência Contratual (ex.: `MAT - BETÃO`)
- **Legenda categorias:** SUB / SRV / MAT / M.O. / INS / ALU (chip selecionável)
- **Bloco fornecedores** (3 colunas Empresa X / Y / Z, extensível): Empresa, Pessoa Contacto, Telemóvel, Email
- **Tabela comparativa** (editável inline tipo grelha):
  `QUANT. | UN | ESPECIFICAÇÃO | PU X | Total X | PU Y | Total Y | PU Z | Total Z | Quant Seco | PU Seco | Total Seco s/IVA`
- **Linha de totais:** `ORÇAMENTO ENTREGUE` (menor válido) | Total X | Total Y | Total Z | Total Seco
- **% por fornecedor:** `1 - (Orç. Entregue / Total Fornecedor)` (tratamento DIV/0)
- **VERBA (Ganho/Perda):** `Total Seco - Total Fornecedor Selecionado` (verde/vermelho)
- **Blocos Condições** por fornecedor: C. Pagamento, Retenção, NIF, Alvará nº
- **Observações** (texto livre + alertas Axia futuros)
- **Requisitos Técnicos** (texto padrão pré-preenchido editável)
- **Rodapé:** "Comparativo elaborado por:" + Ass.&Data + `Mod. 03-1` + paginação

Ações nesta fase: criar/editar/duplicar/eliminar linhas, adicionar fornecedor (>3), excluir linha, upload de anexos por fornecedor, destaques visuais (menor preço a verde, fornecedor selecionado realçado, alerta acima do seco).

### Entradas (entry points)
- Listagem: `Obra > Compras e Contratações > MCE`
- Botão **"Criar MCE a partir desta rubrica"** em cada linha do Budget Objetivo / Reorçamento — pré-preenche Obra, rubrica, qtd, un, PU seco, centro de custo, capítulo, versão

### Cálculos
- `item.total = quantity * unit_price`
- `supplier_total = Σ totais por fornecedor`
- `dry_budget_total`, `lowest_supplier_total`, `gain_loss`, `gain_loss_pct`
- Tratamento de nulos, DIV/0, itens excluídos

---

## Fase 2 — Workflow de aprovação + Requisitos técnicos

- Tabela `mce_approvals` com 4 roles: `project_manager_comparison`, `general_direction_validation`, `financial_direction_information`, `administration_approval`
- Estados: Rascunho → Em consulta → Propostas recebidas → Em análise → Validação técnica → Validação financeira → Em aprovação → Aprovado → Adjudicado → Em execução → Fechado / Cancelado
- Ações: Solicitar validação, Aprovar, Recusar (comentário obrigatório), Histórico
- Permissões por perfil (Admin, Gestor Obra, Direção Geral, Direção Financeira, Administração, Comercial, Leitura)
- Bloco "Requisitos Técnicos e/ou de Qualidade Exigidos" com texto padrão (igual ao Excel) + checkboxes: certificados, declaração CE, fichas técnicas, plano qualidade, seguro, alvará obrigatório
- Validações pré-aprovação: ≥1 proposta válida, NIF, alvará (se obrigatório), justificação se selecionado ≠ menor preço, valor adjudicado > Budget Objetivo

---

## Fase 3 — Integrações: Contratos, Budget Objetivo, Financeiro, Axia

### Contratos
- Tabela `mce_contract_links` — gerar contrato simplificado / adjudicação herdando dados do fornecedor; anexar contrato externo

### Budget Objetivo / Reorçamento
- Após adjudicação: opção "Atualizar Budget Objetivo" com confirmação
- Histórico com origem `MCE nº X`, alerta de desvio + justificação obrigatória
- Não altera Orçamento Base Seco (referência apenas)

### Financeiro da Obra
- Tabela `mce_financial_control` (data, executado, faturado, liquidado, % faturada, % liquidada, por pagar)
- Compromisso financeiro automático ao adjudicar
- Regras: bloquear liquidado > faturado (salvo admin), alertar faturado > executado/adjudicado
- Ligação a faturas existentes

### Axia (edge function `mce-axia-analyze`)
- Lê propostas PDF/Excel/imagem → extrai PU/Total/Qtd/Un/Descrição (Gemini 2.5 Pro)
- Preenche `mce_supplier_item_prices` em rascunho com `confidence` + `review_required`
- Alertas: sem alvará, acima do seco, sem retenção, fornecedor selecionado não é o menor, divergência de quantidades, etc.
- Sugestão de justificação de adjudicação

---

## Fase 4 — Exportação, fornecedores, polimento

- **Export PDF** (jsPDF) com layout fiel ao Excel: cabeçalho, tabela, totais, condições, aprovações, requisitos, contrato, `Mod. 03-1` no rodapé
- **Export Excel** (.xlsx) preservando fórmulas
- Seletor de fornecedor existente da base com auto-preenchimento (contacto, NIF, alvará, condições habituais)
- Criação rápida de fornecedor inline
- Histórico de participação por fornecedor
- Refinamentos mobile + testes

---

## Stack técnica
- React + Vite + Tailwind + shadcn (consistente com o resto)
- Hooks: `useMCEs`, `useMCEDetail`, `useMCEApprovals`, `useMCEFinancialControl`
- Tipos: `src/types/mce.ts` (single source of truth)
- Sem alterações destrutivas a Orçamento / Obras / Financeiro

---

## Confirmação necessária antes de começar

1. **Faseamento OK** (Fase 1 primeiro = MVP utilizável, restantes em sequência)? Ou queres outra ordem?
2. **Localização na app:**
   - (a) Nova entrada na sidebar "Compras e Contratações" agrupando MCE (e futuros: contratos, ordens de compra)
   - (b) Apenas como aba dentro do detalhe da Obra
   - (c) Ambos
3. **Categorias do MCE:** manter os 6 códigos exatos do Excel (SUB / SRV / MAT / M.O. / INS / ALU)?
4. **Posso começar já a Fase 1** após a tua resposta?
