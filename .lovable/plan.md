

# Plano: Traduzir a pagina Definicoes para EN, ES e PT-BR

## Problema
Toda a interface da pagina Definicoes esta hardcoded em portugues (PT-PT). Quando o utilizador muda o idioma nas Preferencias Regionais, nada muda.

## Abordagem
1. Expandir o dicionario de traducoes em `PreferencesContext.tsx` com todas as chaves usadas na pagina Definicoes (~60 novas chaves cobrindo titulos, descricoes, labels, botoes).
2. Atualizar `Definicoes.tsx` para usar `t('chave')` em vez de strings hardcoded em todo o ficheiro.

## Ficheiros a editar

### `src/contexts/PreferencesContext.tsx`
- Adicionar ~60 novas chaves de traducao nos 4 dicionarios (pt-PT, pt-BR, en-US, es-ES):
  - Titulos de seccoes: "Definicoes", "Notificacoes por Email", "Notificacoes Push", "Preferencias Regionais", "Aparencia", "Dados e Privacidade"
  - Subtitulos e descricoes de cada card
  - Labels de cada switch e select (RDOs, Orcamentos, Alertas, Relatorios, Push, Tema, etc.)
  - Botoes: "Guardar Definicoes", "Exportar", "Eliminar", "Cancelar", "Confirmar Eliminacao"
  - Textos do Axia: "Ativar Axia", "Modo preditivo", "Margem minima", "Sensibilidade"
  - Mensagens de toast e alertas

### `src/pages/Definicoes.tsx`
- Importar e usar `t()` do `useFormatting` ou `usePreferences` para substituir todas as strings hardcoded
- A mudanca de idioma fica imediatamente visivel pois o contexto e reativo

## Resultado
Ao mudar o idioma no select, toda a pagina traduz-se instantaneamente para a lingua escolhida.

