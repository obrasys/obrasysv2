

# Sidebar Light Theme — Estilo Fiscaliza

## O que muda

Transformar o sidebar de fundo escuro (azul) para **fundo branco/claro**, com items em cinza e o item ativo em **texto azul + barra lateral azul à direita** (sem background colorido no active). Inspirado no screenshot de referência.

## Alterações

### 1. `src/index.css` — Tokens do sidebar

Trocar as variáveis CSS do sidebar para tema claro:

```
--sidebar-background: 0 0% 100%;        /* branco */
--sidebar-foreground: 220 10% 40%;       /* cinza escuro para texto */
--sidebar-primary: 230 100% 50%;         /* azul vivo para active */
--sidebar-primary-foreground: 230 100% 50%;
--sidebar-accent: 220 15% 96%;           /* hover suave */
--sidebar-accent-foreground: 220 10% 30%;
--sidebar-border: 220 15% 92%;
```

### 2. `src/components/layout/Sidebar.tsx`

- Remover `brightness-0 invert` do logo (fundo agora é branco, logo precisa estar na cor original)
- **Active state**: sem `bg-*`, apenas `text-primary font-semibold` + `border-r-[3px] border-primary` (barra azul à direita como no screenshot)
- **Inactive state**: `text-muted-foreground hover:text-foreground` (sem hover background)
- **Group labels**: `text-muted-foreground/60` (cinza claro)
- Adicionar `border-r border-sidebar-border` no `<aside>` para separar do conteúdo
- Aumentar ligeiramente o spacing entre items (`py-2.5` em vez de `py-1.5`) para match visual
- Admin section: mesma lógica (active = azul, sem bg)
- Sign out button: manter estilo discreto, sem bg no hover

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/index.css` | Editar tokens sidebar (linhas 54-62) |
| `src/components/layout/Sidebar.tsx` | Editar estilos (active state, logo, spacing) |

