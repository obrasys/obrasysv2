
## Página de Descoberta de Fornecedores (`/rede-fornecedores`)

### Objetivo
Criar uma página completa acessível a construtores (ManagerRoute) em `/rede-fornecedores` onde podem pesquisar, filtrar e explorar o diretório de fornecedores certificados por categoria, distrito e nome.

---

### O que já existe (reutilizar)

- **Hook `useAvailableSuppliers(categoryIds)`** em `src/hooks/useSuppliers.ts` — faz query de `supplier_profiles` com join de categorias, filtrando por `status = 'active'`. Requer extensão para filtro por distrito.
- **Hook `useSupplierCategories()`** — retorna as 15 categorias seed.
- **RLS policy `supplier_profiles_builders_select`** — já permite que utilizadores autenticados vejam perfis com `status = 'active'`. Nenhuma alteração de base de dados necessária.
- **Tipo `SupplierProfile`** em `src/types/suppliers.ts` — inclui `location_district`, `rating_avg`, `is_certified`, `sla_response_hours`, etc.
- **Navegação**: `src/config/navigation.ts` tem `MAIN_NAV_ITEMS` onde será adicionada a entrada.
- **Routing**: `src/App.tsx` receberá a nova rota.

---

### Arquitetura das Alterações

```text
src/
├── hooks/useSuppliers.ts
│   └── Novo hook: useDiscoverSuppliers(filters)
│       - Filtra por: categoryIds[], district, search, certifiedOnly
│       - Ordenação: certificados primeiro, depois por rating
│
├── pages/
│   └── rede-fornecedores/
│       └── Index.tsx  (nova página)
│           - AppLayout + ManagerRoute
│           - Painel de filtros (sidebar esquerda)
│           - Grid de cards de fornecedores
│           - Drawer/modal de detalhe do fornecedor
│
├── config/navigation.ts
│   └── Adicionar item "Rede de Fornecedores" (ícone Store)
│       na posição após "Clientes" em MAIN_NAV_ITEMS
│
└── App.tsx
    └── Rota: /rede-fornecedores → ManagerRoute → RedeFornecedoresPage
```

---

### Detalhes de Implementação

#### 1. `useDiscoverSuppliers` (novo hook em `useSuppliers.ts`)

Evolução de `useAvailableSuppliers` com parâmetros adicionais:
- `search: string` — filtra por `legal_name` ou `trade_name` (client-side após fetch, para simplicidade)
- `district: string` — filtro por `location_district` (query-side com `.eq()`)
- `certifiedOnly: boolean` — `.eq('is_certified', true)` quando ativo
- `categoryIds: string[]` — lógica existente via join em `supplier_category_link`

A query principal:
```typescript
supabase
  .from('supplier_profiles')
  .select(`*, supplier_category_link(category_id, supplier_categories(id, name, slug))`)
  .eq('status', 'active')
  .order('is_certified', { ascending: false })
  .order('rating_avg', { ascending: false })
```

#### 2. Página `src/pages/rede-fornecedores/Index.tsx`

Layout em duas colunas (desktop): filtros à esquerda, resultados à direita.

**Painel de filtros (esquerda, colapsável em mobile):**
- Campo de pesquisa por nome
- Select de distrito (lista dos 18 distritos de Portugal)
- Checkboxes de categorias (usando dados de `useSupplierCategories`)
- Switch "Apenas certificados"
- Botão "Limpar filtros"

**Grid de resultados (direita):**
- Cards de fornecedor com:
  - Nome comercial e nome legal
  - Badge "Certificado" com ícone ShieldCheck (se `is_certified`)
  - Distrito e município
  - Categorias como badges
  - Rating stars (se `rating_count > 0`)
  - SLA de resposta em horas
  - Botão "Ver perfil" — abre drawer lateral com detalhes completos

**Drawer de detalhe do fornecedor:**
- Informações completas: nome, NIF, telefone, áreas de serviço, prazo de entrega
- Tabela de preços publicada (se existir, via query a `supplier_pricebooks`)
- Botão "Solicitar Cotação" — abre dialog de pedido de cotação direto

**Estados vazios e loading:**
- Skeleton loader enquanto carrega
- Empty state com ilustração quando sem resultados para os filtros aplicados

#### 3. Navegação (`src/config/navigation.ts`)

Adicionar à `MAIN_NAV_ITEMS` após `{ icon: Users, label: "Clientes", href: "/clientes" }`:
```typescript
{ icon: Store, label: "Rede de Fornecedores", href: "/rede-fornecedores" }
```

Importar `Store` de `lucide-react`.

#### 4. Rota (`src/App.tsx`)

```tsx
import RedeFornecedoresPage from "./pages/rede-fornecedores/Index";
// ...
<Route path="/rede-fornecedores" element={<ManagerRoute><RedeFornecedoresPage /></ManagerRoute>} />
```

---

### Lista de distritos de Portugal

Incluída como constante na página:
```
Aveiro, Beja, Braga, Bragança, Castelo Branco, Coimbra, Évora,
Faro, Guarda, Leiria, Lisboa, Portalegre, Porto, Santarém,
Setúbal, Viana do Castelo, Vila Real, Viseu
```

---

### Ficheiros a criar/editar

| Ficheiro | Ação |
|---|---|
| `src/hooks/useSuppliers.ts` | Adicionar `useDiscoverSuppliers` |
| `src/pages/rede-fornecedores/Index.tsx` | Criar (página principal) |
| `src/config/navigation.ts` | Adicionar item de navegação |
| `src/App.tsx` | Adicionar rota |

Nenhuma alteração de base de dados é necessária — a infraestrutura está completa.
