
## Optimizar Login com Pre-carregamento do Dashboard

### Problema
Apos o login, o utilizador ve um loading extra porque o Dashboard precisa ser descarregado (lazy loading). Antes, o Dashboard ja estava incluido no bundle inicial.

### Solucao
Em vez de reverter o lazy loading (que beneficia quem ja esta logado), vamos **pre-carregar o Dashboard enquanto o utilizador esta na pagina de login**. Assim, quando o login for bem-sucedido, o chunk do Dashboard ja esta pronto.

Tambem vamos pre-carregar a pagina do Portal para utilizadores do tipo cliente.

### Tecnica
- Na pagina `Auth.tsx`, adicionar um `useEffect` que faz `import()` das paginas de destino (Dashboard e Portal) assim que a pagina de login carrega
- O browser descarrega esses chunks em segundo plano enquanto o utilizador preenche o formulario
- Quando o login e feito, a navegacao e instantanea

### Detalhe Tecnico

**Ficheiro: `src/pages/Auth.tsx`**

Adicionar no topo do componente um `useEffect` para pre-carregar os chunks:

```typescript
useEffect(() => {
  // Prefetch destinos pos-login enquanto o utilizador preenche o formulario
  import("./Dashboard");
  import("./portal/Index");
}, []);
```

Esta abordagem mantem todos os beneficios do lazy loading (bundle inicial menor, carregamento mais rapido da primeira pagina) mas elimina o atraso apos o login.
