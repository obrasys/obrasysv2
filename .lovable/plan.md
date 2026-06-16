## Auditoria — o que já existe

Encontrei **dois sistemas paralelos** de fornecedores no Obra Sys:

| Sistema | Onde | Tenant | Função atual |
|---|---|---|---|
| `fornecedores` (2.304 linhas) | `/financeiro`, `useSuppliers` | Sim (`user_id` + `get_org_member_ids()`) | Lista privada por empresa (já multi-tenant) |
| `supplier_profiles` (3 linhas) | `/fornecedor/*`, marketplace | Não (global, leitura pública se `active`) | Rede pública de fornecedores certificados |
| `supplier_pricebooks` + `supplier_pricebook_items` (5 / 231) | Portal fornecedor `/fornecedor/Precos` | Ligado a `supplier_profiles` | Tabelas geridas pelo próprio fornecedor |
| `supplier_invites` (6) | Edge `send-supplier-invite` | **Sem `organization_id`** | Convite para marketplace (não tenant) |
| `quote_requests` (4) | `CotacoesTab`, edge `notify-supplier` | Sim (`builder_user_id`) | Pedidos para marketplace |

**Conclusão da auditoria:** A entidade privada já existe (`fornecedores`) e está isolada. O que falta é: pricebooks/convites/pedidos ligados **a essa entidade privada**, importação Excel/PDF, e área limitada para o fornecedor convidado responder.

**Não mexer já em:** Adjudicação, Budget, Forecast, Folha de Fecho, orçamento principal — apenas criar vínculos (`supplier_id`, `pricebook_item_id`) prontos para integração futura.

---

## Fases (entregas independentes e seguras)

### Fase 1 — Consolidar tenant e schema base
- Adicionar `organization_id` a: `fornecedores`, `supplier_invites`, `quote_requests`, `quote_responses` (preencher a partir de `user_id` via backfill).
- Criar **novas tabelas privadas por empresa**:
  - `tenant_supplier_pricebooks` — id, organization_id, fornecedor_id (→`fornecedores`), uploaded_by, file_id, file_name, file_type, name, valid_from, valid_to, status, notes.
  - `tenant_supplier_pricebook_items` — id, pricebook_id, organization_id, fornecedor_id, codigo_artigo, descricao, unidade, preco_unitario, iva, preco_com_iva, categoria, marca, referencia, observacoes, validade, lead_time_days, origem_importacao.
- Bucket privado `supplier-pricelists` para Excel/PDF originais.
- RLS estrita em todas (org-scoped via `get_org_member_ids()` / helper `is_org_member()`); GRANTs `authenticated` + `service_role`.
- Manter `supplier_profiles`/`supplier_pricebooks` intactas (marketplace continua a funcionar).

### Fase 2 — Convite a fornecedor pela empresa
- Estender `supplier_invites`: `organization_id`, `fornecedor_id` (pré-existente opcional), `categoria`, `mensagem`, `cancelled_at`. Estados: pendente/aceite/expirado/cancelado.
- Botão "Convidar fornecedor" + modal (nome, email, categoria, mensagem).
- Edge `send-supplier-invite` (atualizar): envia email com token e URL `/fornecedor/aceitar?token=...`.
- Página de aceitação cria/liga `supplier_profiles` ao convite e marca `organization_id` para autorização.
- Nova tabela ligação `tenant_supplier_links` (organization_id, supplier_profile_id, fornecedor_id, status) — permite que o portal do fornecedor saiba **a que empresas serve**, sem expor outras.

### Fase 3 — Importação Excel/PDF com pré-visualização
- Modal `ImportPricebookModal` dentro da ficha do fornecedor: upload (Excel ou PDF), fornecedor, categoria, validade, observações.
- Cliente: parse Excel via `xlsx`/`spreadsheet-parser` existente; mapeamento de colunas (codigo, descricao, unidade, preco_unitario, iva, categoria, marca, referencia, observacoes, validade, prazo_entrega).
- Edge `parse-supplier-pricelist` (atualizar): aceita PDF → Gemini 2.5 para extração tabular com chunking 35k (padrão já usado no caderno de encargos).
- Tabela editável de pré-visualização, validações (IVA, preços vazios, duplicados, unidades), com correção inline antes do "Confirmar importação".
- Gravação atómica: 1 `tenant_supplier_pricebooks` + N `tenant_supplier_pricebook_items` em transação RPC `import_tenant_pricebook`.

### Fase 4 — Uso em orçamentos (orçamento de materiais)
- Botão "Adicionar material de fornecedor" no editor de orçamento.
- Modal de pesquisa: filtra por fornecedor da empresa, categoria, descrição, código, marca, validade, preço.
- Multi-select → cria `artigos_orcamento` com `descricao`, `unidade`, `preco_base`, `preco_unitario` (com IVA aplicado conforme regime) e **dois novos vínculos**: `supplier_pricebook_item_id`, `supplier_pricebook_origin_price` (preço original snapshot).
- Preço editável no orçamento; histórico mantido no snapshot.
- Não altera lógica de capítulos, margem real (PV = Custo / (1−Margem%)), IVA, ou Budget/Folha de Fecho.

### Fase 5 — Pedido direto ao fornecedor
- Função "Enviar pedido ao fornecedor" a partir do orçamento, lista de materiais ou ficha do fornecedor.
- Estender `quote_requests`/`quote_request_items`/`quote_responses` com: `fornecedor_id`, `organization_id`, `obra_id`, `delivery_location`, `attachments`, `terms`, estados (rascunho/enviado/visto/respondido/aceite/recusado/em negociação/adjudicado/cancelado/entregue).
- Edge `notify-supplier` (atualizar): email + (se fornecedor com conta) entrada em `/fornecedor/Pedidos` filtrada por `organization_id` autorizado.
- Resposta do fornecedor: preço, prazo, observações, anexo, condições, validade, total/parcial.

### Fase 6 — Vínculos para integração futura
- Vista `v_supplier_awarded_quotes` consolidando pedidos adjudicados (fornecedor, obra, orçamento, artigos, qtd, total, IVA, prazo).
- **Sem** ligar ainda a `obra_purchases`/Forecast/EAC — apenas expor os ids prontos.
- Documento curto `.lovable/fornecedores-tenant.md` com o novo fluxo.

---

## Permissões (Fases 1–5)

| Perfil | Ler | Criar/Editar/Apagar | Convidar | Importar tabela | Enviar pedido | Adjudicar |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Admin empresa | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Gestor obra | ✔ | – | – | – | ✔ | – |
| Comum | ✔ (se permitido) | – | – | – | sugestão | – |
| Fornecedor convidado | só pedidos da empresa que o convidou | só perfil próprio | – | – | só responder | – |

---

## Detalhes técnicos

**DB:** 1 migração por fase. Fase 1 inclui backfill `UPDATE fornecedores SET organization_id = (SELECT organization_id FROM organization_members WHERE user_id = fornecedores.user_id LIMIT 1)`; nenhum DELETE.

**Helpers:** reaproveitar `get_org_member_ids()`, `is_super_admin()`, `is_org_member(org)`. Para portal fornecedor criar `supplier_can_access_org(_org uuid)` SECURITY DEFINER → existe linha em `tenant_supplier_links` com `status='active'`.

**Storage:** bucket `supplier-pricelists` privado; policy: insert/select se `organization_id` do path == org do utilizador.

**Edge functions:** validação Zod (tipo, tamanho ≤10MB, mime), CORS via `npm:@supabase/supabase-js@2/cors`, JWT validado em código.

**Frontend:** novos hooks `useTenantSuppliers`, `useTenantSupplierPricebooks`, `useTenantQuoteRequests`. Página `/fornecedores` (renomear/expandir `financeiro/Fornecedores`) com tabs: Fornecedores | Convites | Tabelas de Preços | Pedidos | Histórico. KPIs no topo (total, convites pendentes, tabelas, pedidos abertos/respondidos).

**Marketplace público:** continua a coexistir em `/rede-fornecedores` (read-only de `supplier_profiles` ativos) — não é tocado.

---

## Critérios de aceitação

- [ ] Empresa A não vê nenhum fornecedor, pricebook, convite ou pedido da empresa B (verificado por teste com 2 contas).
- [ ] Convite enviado → email recebido → aceitação cria `tenant_supplier_links`.
- [ ] Fornecedor convidado vê apenas pedidos das empresas que o convidaram.
- [ ] Excel e PDF importados com pré-visualização editável e gravação atómica.
- [ ] Itens importados aparecem na pesquisa do orçamento e podem ser inseridos.
- [ ] Pedido enviado muda de estado conforme ações do fornecedor.
- [ ] `supplier_profiles`/marketplace continuam a funcionar exatamente como antes.
- [ ] Orçamento, Budget, Folha de Fecho, Forecast/EAC, compras: zero regressões.

---

## Confirma antes de avançar

1. **Avanço pela Fase 1** (auditoria + schema multi-tenant + backfill) primeiro, ou queres ver detalhes da Fase 3 (importação Excel/PDF) antes?
2. A entidade privada deve continuar a chamar-se `fornecedores` (preferida pelo código atual) ou crio uma camada nova `tenant_suppliers` e deprecio `fornecedores` aos poucos?
3. O fornecedor convidado pode ser **um perfil já existente em `supplier_profiles`** (reutilizar conta) ou queres **conta dedicada por empresa** (mesmo email = contas separadas)?
