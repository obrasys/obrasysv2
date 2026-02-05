 # Motor Fiscal Portugal - Documentação
 
 ## Modelo de Dados
 
 ### Tabelas Criadas
 - `regimes_fiscais` - Regimes (normal, reduzido, autoliquidação, isento)
 - `taxas_iva` - Taxas históricas por regime (23%, 6%, 0%)
 - `regras_fiscais` - Regras de determinação automática
 - `notas_legais_fiscais` - Notas obrigatórias por regime
 - `orcamento_contexto_fiscal` - Contexto fiscal por orçamento
 - `auditoria_fiscal` - Log de alterações fiscais
 
 ### Regras Implementadas
 1. Subempreitada para Construtor → Autoliquidação (0%)
 2. Reabilitação Urbana (ARU) → IVA Reduzido (6%)
 3. Renovação Habitação Particular → IVA Reduzido (6%)
 4. Construção Nova → IVA Normal (23%)
 5. Obra Pública para Entidade Pública → Autoliquidação (0%)
 6. Default → IVA Normal (23%)
 
 ## Hooks
 - `useFiscalEngine` - Motor principal
 - `useFiscalReports` - Relatórios de IVA
 
 ## Integração
 - Orçamentos: Configurações → Contexto Fiscal
 - Visualização: Taxa IVA + Nota Legal automáticas
 - PDF/Impressão: Nota legal obrigatória incluída