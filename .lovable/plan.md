

# Plano: Atualizar Definições com todas as funcionalidades ativas

## Alteracoes

### 1. Notificacoes por Email -- todos os switches ON por defeito
- Mudar `emailRelatorios` de `false` para `true` (os restantes ja estao `true`).

### 2. Notificacoes Push -- ja estao todos ON, sem alteracao necessaria.

### 3. Preferencias Regionais -- idiomas e selects ja estao funcionais, sem alteracao.

### 4. Aparencia -- modo claro e escuro funcional
- Integrar `next-themes` (ja instalado) com `ThemeProvider` no `App.tsx`.
- Substituir o `Select` estatico de tema por um que realmente mude o tema via `useTheme()`.
- Remover a mensagem "O tema escuro estará disponível em breve" e mostrar o tema ativo dinamicamente.
- Adicionar variaveis CSS dark mode no `index.css`.

### 5. Axia -- tudo ativo por defeito
- Mudar `axiaLlm` de `false` para `true`.
- Mudar `axiaPredictive` de `false` para `true`.
- Persistir `axiaPredictive` via `updateAxiaSettings` (atualmente so usa `setAxiaPredictive` local).
- Sincronizar `axiaPredictive` com `axiaSettings` no `useEffect`.

### Ficheiros a editar
- `src/pages/Definicoes.tsx` -- defaults e tema funcional
- `src/index.css` -- variaveis dark mode
- `src/App.tsx` -- envolver app com `ThemeProvider`
- `index.html` -- classe `dark` no html tag (next-themes)

