

## Plano: White-label completo — Eliminar referências restantes ao Lovable

### Referências encontradas e ações

**1. `src/pages/CriarConta.tsx` (linha 243)** — URL `obrasysv2.lovable.app` hardcoded
- Substituir por URL relativa ou variável de ambiente (o domínio pode mudar)

**2. `src/components/admin/EmailTemplatePreview.tsx` (linhas 23-24)** — URLs `obrasysv2.lovable.app` em preview de templates
- Substituir pelo domínio correto ou variável

**3. `src/components/admin/EmailTemplateEditor.tsx` (linhas 69-70)** — Mesmo caso do preview
- Substituir pelo domínio correto ou variável

**4. `package.json` (linha 2)** — Nome `vite_react_shadcn_ts`
- Renomear para `obrasys`

**5. `README.md`** — Todo o conteúdo é template Lovable genérico
- Substituir por README do Obra Sys

### O que NÃO será alterado (técnico/invisível)
- `lovable-tagger` em `package.json`/`vite.config.ts` — tooling dev-only, não aparece em produção
- `package-lock.json` — gerado automaticamente
- `index.html`, `manifest.json` — já estão corretos com branding ObraSys

### Resumo
5 ficheiros a editar. Nenhuma alteração de lógica.

