
# Módulo "Rede de Fornecedores Certificados" — Plano de Implementação

## Avaliação de Escopo

Este é um dos módulos mais complexos e extensos possíveis num SaaS. A especificação completa representa facilmente 4–8 semanas de desenvolvimento. O plano abaixo organiza o trabalho num **MVP robusto e funcional**, implementado em fases claras, sem quebrar o sistema existente.

**Restrição técnica importante:** O Lovable é uma aplicação React single-page (SPA) num único domínio. Subdomínios diferentes (`fornecedores.obrasys.pt`) não são roteáveis internamente — a solução é criar rotas dedicadas em `/fornecedor/*` dentro da mesma aplicação, que é o padrão correto para SPAs. O redirecionamento por role ao login garante a separação da experiência.

---

## Arquitetura Geral

```text
Mesma App (obrasys.pt)
├── /auth                    → login construtor (existente)
├── /fornecedor/auth         → login fornecedor (novo)
├── /fornecedor/dashboard    → portal fornecedor (novo)
├── /fornecedor/pedidos      → lista de pedidos de cotação
├── /fornecedor/pedidos/:id  → detalhe + resposta
├── /fornecedor/precos       → base de preços (pricebooks)
├── /fornecedor/perfil       → perfil do fornecedor
├── /dashboard               → construtor (existente)
├── /orcamentos/:id          → Ver Orçamento (com aba Cotações adicionada)
└── /admin                   → admin (existente, + gestão de convites)
```

Auth Único (mesmo Supabase). O redirecionamento por role no login determina o destino.

---

## Base de Dados — Tabelas Novas

### 1. Enums e Categorias

```sql
CREATE TYPE supplier_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE quote_request_status AS ENUM ('open', 'sent', 'in_review', 'closed', 'cancelled');
CREATE TYPE quote_supplier_status AS ENUM ('invited', 'viewed', 'responded', 'declined', 'expired');
CREATE TYPE quote_response_status AS ENUM ('sent', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE pricebook_status AS ENUM ('draft', 'published', 'archived');
```

### 2. Tabelas (11 novas)

| Tabela | Propósito |
|---|---|
| `supplier_categories` | Catálogo de categorias (seed incluído) |
| `supplier_profiles` | Perfil estendido do fornecedor |
| `supplier_category_link` | Relação N:N fornecedor ↔ categoria |
| `supplier_pricebooks` | Tabelas de preços do fornecedor |
| `supplier_pricebook_items` | Itens individuais de cada tabela |
| `quote_requests` | Pedido de cotação criado pelo construtor |
| `quote_request_categories` | Categorias de cada pedido |
| `quote_request_suppliers` | Fornecedores convidados por pedido |
| `quote_responses` | Resposta do fornecedor ao pedido |
| `quote_response_items` | Itens linha da resposta |
| `supplier_invites` | Convites controlados pelo admin |

### 3. Extensão da tabela `profiles` existente

Adicionar colunas: `supplier_role` (separado do `role` existente para não quebrar o sistema), usando um campo booleano `is_supplier` + status. **O campo `role` existente não é alterado** — apenas adicionamos lógica para o novo role `supplier` no enum.

**Decisão de segurança:** O `role` atual já suporta 'admin', 'gestor', 'fiscal', 'cliente', 'financeiro', 'sales'. Adicionaremos `'supplier'` ao enum da coluna `role` da tabela `profiles`.

---

## RLS — Políticas de Segurança

### Por tabela:

**`supplier_profiles`**
- SELECT: próprio fornecedor (`user_id = auth.uid()`) + construtores (authenticated, campos limitados via view)
- INSERT/UPDATE/DELETE: apenas próprio (`user_id = auth.uid()`)

**`supplier_pricebooks` + `supplier_pricebook_items`**
- CRUD: apenas próprio fornecedor

**`quote_requests`**
- INSERT/UPDATE/SELECT: apenas o builder que criou (`builder_user_id = auth.uid()`)

**`quote_request_suppliers`**
- SELECT builder: `quote_request_id` pertence ao seu `quote_request`
- SELECT supplier: `supplier_id` = o seu `supplier_profile.id`
- UPDATE supplier: apenas o seu registo (viewed_at, responded_at, status)

**`quote_responses` + `quote_response_items`**
- INSERT/UPDATE supplier: apenas responses onde `supplier_id` é o seu
- SELECT builder: apenas responses de `quote_request_id` que pertence a ele
- SELECT supplier: apenas as próprias

**`supplier_invites`**
- INSERT: super_admin apenas
- SELECT: super_admin ou o próprio email

---

## Componentes Frontend — O Que Será Criado

### A) Novos tipos TypeScript
- `src/types/suppliers.ts` — todos os tipos do módulo

### B) Novo hook
- `src/hooks/useSuppliers.ts` — queries e mutations para o módulo

### C) Componentes do Portal Fornecedor (`src/components/fornecedor/`)
- `SupplierLayout.tsx` — layout tipo `ClientPortalLayout` mas para fornecedores
- `SupplierRoute.tsx` — guard de rota para role `supplier`
- `SupplierDashboard.tsx` — visão geral com KPIs
- `SupplierPedidoCard.tsx` — card de pedido recebido
- `SupplierPricebookTable.tsx` — tabela editável de preços
- `SupplierPerfilForm.tsx` — formulário de perfil

### D) Páginas do Portal Fornecedor (`src/pages/fornecedor/`)
- `Auth.tsx` — login com marca ObraSys + label "Fornecedor"
- `Dashboard.tsx` — dashboard
- `Pedidos.tsx` — lista de pedidos
- `PedidoDetalhe.tsx` — detalhe + resposta
- `Precos.tsx` — base de preços
- `Perfil.tsx` — perfil
- `PendingApproval.tsx` — ecrã "conta em validação"

### E) Integração no Orçamento Existente (`src/pages/orcamentos/Ver.tsx`)
- Adição de uma aba "Cotações" no orçamento (não altera o layout existente)
- `src/components/orcamentos/CotacoesTab.tsx` — nova componente com:
  - Botão "Solicitar Cotação"
  - Dialog de criação de pedido (categorias, prazo, mensagem)
  - Status dos pedidos enviados
  - Tabela comparativa de respostas
  - Botão "Aplicar ao Orçamento" (mapeamento de itens)

### F) Integração no Admin (`src/pages/admin/`)
- Adição de menu "Fornecedores" no painel admin
- `src/pages/admin/Fornecedores.tsx` — gestão de convites + certificação

### G) Edge Function
- `supabase/functions/notify-supplier/index.ts` — email ao fornecedor quando recebe pedido (via Resend, já configurado)

---

## Seed de Categorias

```sql
INSERT INTO supplier_categories (name, slug) VALUES
  ('Cerâmica e Pavimentos', 'ceramica-pavimentos'),
  ('Materiais de Construção', 'materiais-construcao'),
  ('Aço e Ferro', 'aco-ferro'),
  ('Betão e Pré-fabricados', 'betao-prefabricados'),
  ('Canalização e Águas', 'canalizacao-aguas'),
  ('Elétrica e Energias', 'eletrica-energias'),
  ('Pintura e Acabamentos', 'pintura-acabamentos'),
  ('Carpintaria e Madeiras', 'carpintaria-madeiras'),
  ('Alumínios e Vidros', 'aluminios-vidros'),
  ('Gesso Cartonado', 'gesso-cartonado'),
  ('Telecomunicações / ITED', 'telecom-ited'),
  ('Isolamentos e Impermeabilizações', 'isolamentos'),
  ('Equipamentos e Ferramentas', 'equipamentos-ferramentas'),
  ('Serralharia', 'serralharia'),
  ('Pré-fabricados e Módulos', 'prefabricados-modulos');
```

---

## Fluxo End-to-End

```text
CONSTRUTOR (no orçamento)
    │
    ├─ Abre aba "Cotações"
    ├─ Clica "Solicitar Cotação"
    ├─ Preenche: categorias + prazo + mensagem
    ├─ Sistema mostra fornecedores disponíveis (matching por categoria)
    ├─ Seleciona fornecedores → Envia
    │      └─ Cria: quote_request + quote_request_suppliers
    │      └─ Dispara email (Edge Function notify-supplier)
    │
    └─ Vê painel de status: "3 enviados | 1 visualizou | 1 respondeu"
         └─ Tabela comparativa de respostas
              └─ "Aplicar ao orçamento" → import de itens

FORNECEDOR (portal /fornecedor/*)
    ├─ Recebe email com notificação
    ├─ Login em /fornecedor/auth
    ├─ Dashboard: badge "1 Novo Pedido"
    ├─ Abre pedido: vê distrito/categoria/prazo/mensagem
    ├─ Clica "Responder"
    │      ├─ Preenche itens manualmente
    │      OU └─ Importa do pricebook
    └─ Submete resposta → status muda para "responded"
```

---

## Rotas Novas no App.tsx

```tsx
{/* Portal Fornecedor */}
<Route path="/fornecedor/auth" element={<FornecedorAuth />} />
<Route path="/fornecedor/pending" element={<FornecedorPending />} />
<Route path="/fornecedor/dashboard" element={<SupplierRoute><FornecedorDashboard /></SupplierRoute>} />
<Route path="/fornecedor/pedidos" element={<SupplierRoute><FornecedorPedidos /></SupplierRoute>} />
<Route path="/fornecedor/pedidos/:id" element={<SupplierRoute><FornecedorPedidoDetalhe /></SupplierRoute>} />
<Route path="/fornecedor/precos" element={<SupplierRoute><FornecedorPrecos /></SupplierRoute>} />
<Route path="/fornecedor/perfil" element={<SupplierRoute><FornecedorPerfil /></SupplierRoute>} />

{/* Admin Fornecedores */}
<Route path="/admin/fornecedores" element={<SuperAdminRoute><AdminFornecedores /></SuperAdminRoute>} />
```

---

## Sequência de Implementação

### Fase 1 — Base de Dados + RLS (1 migração)
- Criar enums, 11 tabelas, políticas RLS completas, seed de categorias
- Estender `profiles.role` com o valor `supplier`

### Fase 2 — Tipos + Hook Base
- `src/types/suppliers.ts`
- `src/hooks/useSuppliers.ts`

### Fase 3 — Auth do Fornecedor + Route Guard
- `src/pages/fornecedor/Auth.tsx`
- `src/components/fornecedor/SupplierRoute.tsx`
- Atualizar `Index.tsx` para redirecionar `supplier` para `/fornecedor/dashboard`
- Atualizar `Auth.tsx` para redirecionar `supplier` após login

### Fase 4 — Portal do Fornecedor (5 páginas)
- Layout, Dashboard, Pedidos, Detalhe+Resposta, Preços, Perfil

### Fase 5 — Integração no Orçamento
- Aba "Cotações" em `Ver.tsx` (sem tocar no layout existente)
- `CotacoesTab.tsx` com seleção de fornecedores, envio, comparativo e import

### Fase 6 — Admin Fornecedores
- Página de convites + certificação no painel admin

### Fase 7 — Edge Function de Notificação
- `supabase/functions/notify-supplier/index.ts`

### Fase 8 — Navegação + Polimento Final
- Adicionar "Rede de Fornecedores" na sidebar principal (ícone de `Store`)
- Página de discovery para construtores: `/rede-fornecedores`

---

## Detalhes Técnicos

- **Sem subdomínio técnico:** a app React é SPA, os "domínios" separados são geridos por DNS/proxy (Lovable Publish) apontando para a mesma app. As rotas `/fornecedor/*` isolam a experiência.
- **Auth único:** mesmo Supabase Auth. O campo `role = 'supplier'` nos profiles determina o destino após login.
- **Onboarding por convite:** admin cria `supplier_invites` com token UUID, fornecedor acede a `/fornecedor/auth?invite=TOKEN`, que pré-preenche email e força criação de conta com role supplier.
- **Dados sensíveis:** queries de cotação para fornecedores nunca retornam nome/morada do cliente final — apenas distrito, categoria, itens/quantidades.
- **Emails:** a Edge Function `notify-supplier` usa o `RESEND_API_KEY` já configurado.

---

## O que NÃO está no MVP (mas pode ser adicionado depois)
- Sistema de rating/avaliação de fornecedores
- Importação CSV de pricebook
- Notificações in-app em tempo real (Supabase Realtime)
- Analytics avançados de cotações
- Filtro por raio_km (requer PostGIS — complexidade extra)
- Configurações de notificações de email por fornecedor
