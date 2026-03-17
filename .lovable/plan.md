

# Orcamento Essencial - Plano de Implementacao

## Resumo

Criar um novo fluxo simplificado de criacao de orcamentos em 3 passos (wizard), utilizando as tabelas existentes (`orcamentos`, `capitulos_orcamento`, `artigos_orcamento`, `clientes`). O objetivo e reduzir a friccao para utilizadores em trial, permitindo criar um orcamento profissional em menos de 5 minutos.

---

## 1. Base de Dados

### 1.1 Nova tabela: `orcamento_templates_essencial`

```sql
CREATE TABLE orcamento_templates_essencial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo_obra TEXT NOT NULL,
  itens_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: leitura publica (templates do sistema)
ALTER TABLE orcamento_templates_essencial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates essenciais sao publicos" ON orcamento_templates_essencial
  FOR SELECT USING (true);
```

### 1.2 Nova tabela: `essencial_events` (tracking de conversao)

```sql
CREATE TABLE essencial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  orcamento_id UUID REFERENCES orcamentos(id) ON DELETE SET NULL,
  tempo_total_segundos INTEGER,
  quantidade_itens INTEGER,
  modelo_utilizado BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE essencial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own events" ON essencial_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own events" ON essencial_events
  FOR SELECT USING (auth.uid() = user_id);
```

### 1.3 Seed de templates iniciais

Inserir dados de templates para os tipos de obra mais comuns (moradia_nova, remodelacao, etc.) com itens pre-definidos via a ferramenta de insert.

---

## 2. Novos Ficheiros Frontend

### 2.1 Pagina principal do wizard
**`src/pages/orcamentos/Essencial.tsx`**

- Wizard com 3 passos e barra de progresso horizontal
- Gestao de estado local com `useState` + autosave via `useEffect`
- Microcopy motivacional no topo

### 2.2 Componentes do wizard (na pasta `src/components/orcamentos/essencial/`)

- **`EssencialWizardProgress.tsx`** - Barra de progresso com 3 etapas visuais
- **`EssencialStep1Cliente.tsx`** - Formulario do cliente (nome, email, telefone, tipo_obra)
- **`EssencialStep2Trabalhos.tsx`** - Toggle modelo/manual, tabela simplificada de itens, resumo lateral
- **`EssencialStep3LucroEnvio.tsx`** - Slider de lucro (0-40%), opcoes de IVA/email/PDF, botao final

### 2.3 Hook dedicado
**`src/hooks/useOrcamentoEssencial.ts`**

- Logica de criar/encontrar cliente
- Criar orcamento com status `rascunho` (reutiliza schema existente)
- Criar capitulo unico "Trabalhos" e artigos simplificados
- Carregar templates
- Autosave parcial em localStorage
- Tracking de eventos

---

## 3. Alteracoes em Ficheiros Existentes

### 3.1 `src/App.tsx`
- Importar `EssencialPage` 
- Adicionar rota: `/orcamentos/essencial/novo`

### 3.2 `src/pages/Dashboard.tsx`
- Adicionar secao com dois botoes antes dos KPIs:
  - Botao primario: "Criar Orcamento em 3 Passos" (com subtexto "Demora menos de 5 minutos")
  - Botao secundario: "Orcamento Avancado"

### 3.3 `src/pages/orcamentos/Index.tsx`
- Adicionar botao "Orcamento Essencial" junto ao botao "Novo Orcamento" existente

---

## 4. Fluxo Detalhado

### Passo 1 - Cliente
- 4 campos: nome, email, telefone, tipo_obra (select com 5 opcoes)
- Ao continuar: verifica se cliente existe por email, cria se necessario
- Cria registo em `orcamentos` com titulo auto-gerado, margem default 20%

### Passo 2 - Trabalhos
- Toggle "Usar Modelo" / "Criar do Zero"
- Modelo: carrega `orcamento_templates_essencial` filtrado por tipo_obra, popula itens
- Manual: tabela com colunas `descricao` e `valor`, botao "Adicionar Trabalho"
- Cada item salva em `artigos_orcamento` (dentro de um capitulo unico criado automaticamente)
- Resumo lateral: subtotal, lucro (default 20%), total estimado - calculado no frontend

### Passo 3 - Lucro e Envio
- Slider 0-40% para margem de lucro
- Calculo em tempo real de valor_lucro e total_final
- IVA aplicado automaticamente via motor fiscal existente (sem mostrar campos tecnicos)
- Opcoes: incluir IVA, enviar por email, gerar PDF
- Botao "Gerar Orcamento" finaliza, atualiza status, redireciona para visualizacao

---

## 5. Compatibilidade com Modo Avancado

- Na pagina de visualizacao do orcamento (`/orcamentos/:id`), se o orcamento foi criado no modo essencial, mostrar botao "Editar em modo avancado" que redireciona para `/orcamentos/:id/editar`
- Sem perda de dados - os dados estao nas mesmas tabelas

---

## 6. Mapeamento de Dados (Essencial para Tabelas Existentes)

| Campo Essencial | Tabela/Campo Existente |
|---|---|
| nome_cliente, email, telefone | `clientes` (criar ou associar) |
| tipo_obra | `orcamentos.custos_indiretos` metadata ou titulo |
| descricao + valor (item) | `artigos_orcamento.descricao`, `preco_unitario`, quantidade=1, unidade='vg' |
| lucro_percentual | `orcamentos.margem_lucro` |
| Capitulo unico | `capitulos_orcamento` com titulo "Trabalhos" |

---

## 7. Sequencia de Implementacao

1. Criar tabelas de base de dados (templates + eventos)
2. Inserir templates seed
3. Criar componentes do wizard (progress, step1, step2, step3)
4. Criar hook `useOrcamentoEssencial`
5. Criar pagina `Essencial.tsx`
6. Atualizar rotas em `App.tsx`
7. Atualizar Dashboard com botoes de acesso rapido
8. Atualizar lista de orcamentos com botao essencial

