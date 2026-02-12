

## Portal do Cliente - Acompanhamento de Obra

### Resumo
Criar um portal read-only para clientes finais acompanharem as suas obras (progresso, RDOs, fotografias), com acesso seguro via convite automático no momento da adjudicacao e auditoria completa de visualizacoes.

---

### Fase 1: Base de Dados (Migracao SQL)

**1.1 Tabela `client_obra_access`** - Ligacao cliente-obra
```text
- id (uuid, PK)
- client_user_id (uuid, FK -> auth.users)
- obra_id (uuid, FK -> obras)
- granted_by (uuid) - quem concedeu acesso
- ativo (boolean, default true)
- created_at (timestamptz)
```

**1.2 Tabela `client_access_logs`** - Auditoria de acessos
```text
- id (uuid, PK)
- client_user_id (uuid, FK -> auth.users)
- obra_id (uuid)
- event_type (text) - portal_open, rdo_open, rdo_download, photo_open
- entity_type (text, nullable) - rdo, photo, progress
- entity_id (text, nullable)
- metadata (jsonb, nullable) - user_agent, detalhes extra
- occurred_at (timestamptz, default now())
```

**1.3 Funcao `is_client_of_obra`** (security definer)
```text
Verifica se auth.uid() tem acesso ativo a uma obra_id na tabela client_obra_access.
Usada em todas as politicas RLS do portal.
```

**1.4 Politicas RLS**
- `obras`: SELECT adicional para clientes (apenas campos seguros: nome, endereco, status, progresso, data_inicio, data_fim)
- `obra_progress_tracking`: SELECT para clientes da obra
- `relatorios_diarios`: SELECT para clientes da obra (apenas RDOs aprovados/submetidos)
- `client_obra_access`: SELECT/INSERT proprio, SELECT para super admins
- `client_access_logs`: INSERT para o proprio cliente, SELECT para dono da obra e super admins
- Bucket `rdo-fotos`: SELECT para clientes da obra

**1.5 Atualizar perfil role**
- Adicionar 'client' como valor valido no campo `role` da tabela `profiles`

---

### Fase 2: Edge Function `create-client-portal-access`

Invocada quando um orcamento e adjudicado. Responsavel por:

1. Verificar se o orcamento tem `cliente_id` com email valido
2. Verificar se ja existe utilizador auth com esse email
3. Se nao existir: criar utilizador via Admin API com senha temporaria
4. Criar perfil com role = 'client'
5. Inserir registo em `client_obra_access`
6. Enviar email de convite via Resend com link de acesso e credenciais

---

### Fase 3: Integracao com Adjudicacao

Modificar `useOrcamentos.ts` no `updateStatus` (status = 'adjudicado'):
- Apos criar a obra, invocar a edge function `create-client-portal-access` passando o `orcamento_id`
- Mostrar toast de confirmacao ao utilizador

---

### Fase 4: Frontend - Portal do Cliente

**4.1 Rota `/portal`**
- Protegida: so acessivel para role = 'client'
- Redireciona para login se nao autenticado

**4.2 Layout `ClientPortalLayout`**
- Layout simplificado sem sidebar do gestor
- Header com logo ObraSys + nome do cliente + botao sair
- Sem acesso a qualquer menu de gestao

**4.3 Pagina principal `/portal`**
- Lista as obras do cliente (via `client_obra_access`)
- Card por obra com: nome, estado, progresso, morada

**4.4 Pagina da obra `/portal/obra/:id`**
- Cabecalho: nome da obra, morada, estado, empresa responsavel
- Tabs ou seccoes:

  **Progresso:**
  - Barra de progresso geral (0-100%)
  - Lista de marcos (obra_progress_tracking) em modo leitura
  - Ultima atualizacao

  **RDOs:**
  - Lista de RDOs aprovados/submetidos, ordenados por data
  - Filtro por periodo e pesquisa
  - Abrir detalhe em modal/pagina
  - Botao download PDF (reutiliza RDOPdfExport)

  **Fotografias:**
  - Grid de fotos dos RDOs da obra
  - Agrupadas por data/RDO
  - Modal lightbox para zoom
  - Legendas com data

  **Atividade:**
  - Ultimo acesso
  - Ultimas visualizacoes do cliente

**4.5 Hook `useClientPortal`**
- Busca obras do cliente via `client_obra_access`
- Busca progresso, RDOs e fotos para uma obra
- Funcao `logEvent()` para registar acessos em `client_access_logs`

**4.6 Componente `ClientRoute`**
- Guard de rota que verifica role = 'client'
- Redireciona para `/portal` se cliente tenta aceder rotas internas

---

### Fase 5: Routing e AuthContext

**5.1 AuthContext**
- Apos login, se `profile.role === 'client'`, redirecionar para `/portal` em vez de `/dashboard`

**5.2 App.tsx**
- Adicionar rotas:
  - `/portal` -> PortalIndex
  - `/portal/obra/:id` -> PortalObra
- Protegidas por `ClientRoute`

**5.3 Sidebar/TopBar**
- Sem alteracoes - clientes nunca veem estes componentes (usam ClientPortalLayout)

---

### Fase 6: Template de Email

Criar template `convite-portal-cliente` na tabela `email_templates`:
- Assunto: "A sua obra ja esta no ObraSys"
- Corpo: boas-vindas, link de acesso, credenciais temporarias
- Variaveis: `{{nome}}`, `{{obraName}}`, `{{loginUrl}}`, `{{email}}`, `{{senha}}`

---

### Fase 7: Auditoria no Admin

Adicionar no painel Admin uma seccao para ver logs de acesso dos clientes:
- Filtro por obra e por cliente
- Tabela com evento, data/hora, entidade visualizada

---

### Detalhes Tecnicos

**Ficheiros novos (~15):**
- `src/pages/portal/Index.tsx` - Dashboard do cliente
- `src/pages/portal/Obra.tsx` - Detalhe da obra
- `src/components/portal/ClientPortalLayout.tsx` - Layout dedicado
- `src/components/portal/ClientRoute.tsx` - Guard de rota
- `src/components/portal/PortalProgressCard.tsx`
- `src/components/portal/PortalRDOList.tsx`
- `src/components/portal/PortalRDODetail.tsx`
- `src/components/portal/PortalPhotoGallery.tsx`
- `src/components/portal/PortalActivityLog.tsx`
- `src/components/portal/PortalObraCard.tsx`
- `src/hooks/useClientPortal.ts`
- `src/types/portal.ts`
- `supabase/functions/create-client-portal-access/index.ts`

**Ficheiros modificados (~4):**
- `src/App.tsx` - novas rotas /portal
- `src/contexts/AuthContext.tsx` - redirect para /portal se client
- `src/hooks/useOrcamentos.ts` - chamar edge function na adjudicacao
- `supabase/config.toml` - config da nova edge function

**Migracao SQL:**
- 1 migracao com tabelas, funcoes RLS, politicas e template de email

**Seguranca:**
- Cliente NUNCA ve: valores financeiros, margens, custos, fornecedores, equipa, cronogramas internos
- RLS garante isolamento total por obra
- Funcao security definer `is_client_of_obra()` previne recursao RLS
- Fotos servidas via signed URLs (bucket privado)
- Logs de auditoria imutaveis (INSERT only para clientes)

