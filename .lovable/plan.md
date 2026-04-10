

# Navegação Colapsável na Sidebar

## Resumo

Transformar os grupos de navegação da sidebar em secções colapsáveis (accordion). Cada grupo (Comercial, Obras, Recursos, etc.) será um botão clicável que expande/recolhe os seus sub-itens. Grupos com apenas 1 item (Visão Geral, Financeiro) ficam sempre visíveis sem accordion. O grupo que contém a rota ativa abre automaticamente. Aplicar o mesmo padrão no menu mobile (TopBar drawer).

## Comportamento

- Clicar no label do grupo (ex: "Comercial") expande/recolhe os sub-itens com animação suave
- O grupo com a rota ativa abre automaticamente ao carregar
- Múltiplos grupos podem estar abertos simultaneamente
- Ícone chevron (seta) à direita do label indica estado aberto/fechado
- Grupos com 1 único item (Dashboard, Financeiro) mostram o item diretamente sem accordion

## Alterações

### 1. `src/components/layout/Sidebar.tsx`
- Adicionar estado `openGroups` (Set de labels abertos)
- Para cada grupo com mais de 1 item: renderizar label como botão clicável com ChevronDown/ChevronRight
- Sub-itens ficam dentro de div com transição de altura (max-height + overflow-hidden + transition)
- Auto-abrir grupo que contém rota ativa
- Grupos com 1 item renderizam diretamente sem wrapper colapsável

### 2. `src/components/layout/TopBar.tsx`
- Aplicar a mesma lógica de accordion no menu drawer mobile
- Manter consistência visual entre desktop e mobile

### 3. `src/config/navigation.ts`
- Adicionar um ícone representativo a cada grupo (NavGroup ganha campo `icon`) para mostrar no botão do grupo
- Comercial: `Briefcase`, Obras: `Building2`, Recursos: `HardHat`, etc.

## Direção Visual

- Label do grupo: texto `text-[13px]` com ícone do grupo + chevron à direita
- Estilo semelhante aos itens mas com opacidade diferente para distinguir
- Animação suave de 200ms na abertura/fecho
- Chevron roda 90° quando aberto

