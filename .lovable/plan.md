

# Redesign dos Recursos com Cards com Foto + Equipa Ativa no Dashboard

## Contexto
As tabelas `equipa_membros`, `subempreiteiros` e `equipamentos` **nao possuem campo de foto**. Sera necessario adicionar uma coluna `foto_url` a cada tabela e implementar upload de imagem no formulario de cada recurso. O design dos cards seguira o modelo do anexo: avatar circular grande, nome em destaque, funcao/especialidade, e metadados como obra, vinculo e remuneracao.

## Plano

### 1. Migracao de Base de Dados
Adicionar coluna `foto_url TEXT NULL` nas 3 tabelas:
- `equipa_membros`
- `subempreiteiros`
- `equipamentos`

Criar um storage bucket `recursos` para armazenar as fotos, com politicas RLS para upload/leitura pelo proprietario.

### 2. Atualizar Tipos TypeScript
Adicionar `foto_url?: string | null` nos tipos `EquipaMembro`, `Subempreiteiro`, `Equipamento` e nos respectivos `FormData`.

### 3. Componente de Upload de Foto nos Formularios
Criar um componente reutilizavel `ResourcePhotoUpload` que:
- Mostra o avatar atual ou um placeholder
- Permite selecionar uma imagem (max 2MB)
- Faz upload para o bucket `recursos` no storage
- Retorna a URL publica

Integrar este componente nos 3 formularios existentes: `SubempreiteiroForm`, `EquipamentoForm`, `EquipaMembroForm`.

### 4. Redesign da Pagina de Recursos (Cards)
Substituir as tabelas atuais por grelhas de cards visuais no estilo do anexo:
- **Avatar circular** grande com a foto ou iniciais como fallback
- **Nome** em destaque (bold, cor primaria `#00679d`)
- **Funcao/Especialidade/Categoria** como subtitulo
- **Metadados**: Obra associada, vinculo (contrato/estado), remuneracao/valor
- **Badge** de estado (Ativo/Inativo, Disponivel/Em Uso)
- **Menu de acoes** (editar/eliminar) no canto

Layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`

### 5. Equipa Ativa no Dashboard Principal
Atualizar `DashboardStats.tsx` na seccao "Equipa Ativa":
- Substituir o avatar com fallback de iniciais pelo avatar com `foto_url`
- Usar `AvatarImage` com a URL da foto quando disponivel
- Manter fallback de iniciais para membros sem foto

### Ficheiros Afetados
- **Migracao SQL**: nova migracao para colunas + bucket + RLS
- `src/types/recursos.ts` — adicionar `foto_url`
- `src/hooks/useRecursos.ts` — incluir `foto_url` nos CRUD
- `src/components/recursos/ResourcePhotoUpload.tsx` — novo componente
- `src/components/recursos/SubempreiteiroForm.tsx` — integrar upload
- `src/components/recursos/EquipamentoForm.tsx` — integrar upload
- `src/components/recursos/EquipaMembroForm.tsx` — integrar upload
- `src/pages/recursos/Index.tsx` — substituir tabelas por cards
- `src/components/dashboard/DashboardStats.tsx` — foto na Equipa Ativa

