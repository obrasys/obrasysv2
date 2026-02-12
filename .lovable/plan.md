

## Ícone na Tela Inicial do Telemóvel

### Problema
Atualmente, quando um utilizador adiciona o ObraSys à tela inicial do telemóvel, aparece apenas a letra "O" genérica porque falta um ficheiro **manifest.json** (Web App Manifest) com os ícones Apple Touch e Android configurados.

### Solução
Criar um ficheiro `manifest.json` e adicionar as meta tags necessárias no `index.html` para que os dispositivos móveis (iOS e Android) utilizem o logótipo do ObraSys como ícone da app na tela inicial.

### O que será feito

1. **Copiar o logótipo existente** (`src/assets/logo.png`) para a pasta `public/` para ser acessível como ícone
2. **Criar o ficheiro `public/manifest.json`** com as definições da Web App:
   - Nome: "ObraSys"
   - Ícones em múltiplos tamanhos (192x192 e 512x512)
   - Cores do tema da aplicação
   - Modo standalone (para parecer uma app nativa)
3. **Atualizar o `index.html`** para incluir:
   - Link para o `manifest.json`
   - Meta tag `apple-touch-icon` (para iOS)
   - Meta tag `theme-color`

### Detalhes Técnicos

- O logótipo atual (`logo.png`) será utilizado como base para o ícone
- O `apple-touch-icon` garante que o iOS utilize o logótipo correto
- O `manifest.json` garante que o Android/Chrome utilize o logótipo correto
- As propriedades `display: standalone` e `theme-color` farão a app parecer mais nativa quando aberta a partir da tela inicial

### Nota
O logótipo existente tem fundo transparente com texto azul. Para melhor visibilidade como ícone de app, seria ideal ter uma versão quadrada com fundo (por exemplo, fundo branco com o logo). Se desejar, pode fornecer uma imagem quadrada específica para o ícone. Caso contrário, utilizaremos o logótipo atual.

