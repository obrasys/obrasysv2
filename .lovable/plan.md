

## Plano: White-label completo — Remover referências ao Lovable

### Contexto
Existem referências visíveis ao "Lovable" em metadados HTML e comentários TODO que devem ser removidos para garantir white-label completo. As referências internas em edge functions (API gateway, variáveis de ambiente) são técnicas e necessárias — não serão alteradas.

### Alterações

**1. `index.html` — Limpar metadados e comentários**
- Remover `<meta name="author" content="Lovable" />`
- Remover `<meta name="twitter:site" content="@Lovable" />`
- Remover os dois comentários `<!-- TODO: ... -->`
- Substituir author por "ObraSys"

**2. Nenhuma outra alteração necessária**
- As referências em edge functions (`LOVABLE_API_KEY`, `ai.gateway.lovable.dev`) são infraestrutura interna, não visíveis ao utilizador — mantêm-se.
- O `lovable-tagger` em `vite.config.ts` e `package.json` é tooling de desenvolvimento, não aparece em produção.
- Páginas públicas (Auth, Dashboard, NotFound, Portal) já usam branding "ObraSys" correto.
- O badge "Edit in Lovable" é controlado nas definições do projeto, não no código.

### Resumo
Apenas o ficheiro `index.html` precisa de edição — 4 linhas a remover/alterar.

