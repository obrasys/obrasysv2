 // Tipos para o Motor Fiscal Portugal
 
 export type RegimeFiscalTipo = 'normal' | 'reduzido' | 'autoliquidacao' | 'isento';
 export type TipoOperacaoFiscal = 'empreitada' | 'subempreitada' | 'servicos' | 'materiais' | 'mao_obra';
 export type TipoClienteFiscal = 'particular' | 'empresa' | 'construtor' | 'entidade_publica';
 export type TipoObraFiscal = 'construcao_nova' | 'reabilitacao_urbana' | 'renovacao_habitacao' | 'manutencao' | 'obra_publica';
 
 export interface RegimeFiscal {
   id: string;
   codigo: string;
   nome: string;
   tipo: RegimeFiscalTipo;
   descricao: string | null;
   ativo: boolean;
   created_at: string;
   updated_at: string;
 }
 
 export interface TaxaIVA {
   id: string;
   regime_id: string;
   percentagem: number;
   data_inicio: string;
   data_fim: string | null;
   ativo: boolean;
   created_at: string;
   updated_at: string;
   regime?: RegimeFiscal;
 }
 
 export interface RegraFiscal {
   id: string;
   codigo: string;
   nome: string;
   descricao: string | null;
   tipo_obra: TipoObraFiscal | null;
   tipo_cliente: TipoClienteFiscal | null;
   tipo_operacao: TipoOperacaoFiscal | null;
   regime_id: string;
   prioridade: number;
   data_inicio: string;
   data_fim: string | null;
   ativo: boolean;
   referencia_legal: string | null;
   created_at: string;
   updated_at: string;
   regime?: RegimeFiscal;
 }
 
 export interface NotaLegalFiscal {
   id: string;
   regime_id: string;
   codigo: string;
   texto: string;
   texto_curto: string | null;
   referencia_legal: string | null;
   obrigatoria: boolean;
   ordem: number;
   ativo: boolean;
   created_at: string;
   updated_at: string;
   regime?: RegimeFiscal;
 }
 
 export interface OrcamentoContextoFiscal {
   id: string;
   orcamento_id: string;
   tipo_obra: TipoObraFiscal | null;
   tipo_cliente: TipoClienteFiscal | null;
   tipo_operacao: TipoOperacaoFiscal | null;
   regime_id: string | null;
   regra_aplicada_id: string | null;
   taxa_iva: number;
   override_manual: boolean;
   override_justificacao: string | null;
   override_por: string | null;
   override_em: string | null;
   user_id: string;
   created_at: string;
   updated_at: string;
   regime?: RegimeFiscal;
   regra?: RegraFiscal;
 }
 
 export interface AuditoriaFiscal {
   id: string;
   user_id: string;
   entidade_tipo: 'orcamento' | 'auto_medicao' | 'conta_financeira';
   entidade_id: string;
   acao: 'calculo_automatico' | 'override_manual' | 'alteracao_regime';
   dados_anteriores: Record<string, unknown> | null;
   dados_novos: Record<string, unknown> | null;
   regime_anterior_id: string | null;
   regime_novo_id: string | null;
   taxa_anterior: number | null;
   taxa_nova: number | null;
   justificacao: string | null;
   ip_address: string | null;
   created_at: string;
 }
 
 // Resultado do motor fiscal
 export interface ResultadoFiscal {
   regime_id: string;
   regime_codigo: string;
   regime_nome: string;
   taxa_iva: number;
   regra_id: string | null;
   regra_codigo: string | null;
   nota_legal: string | null;
 }
 
 // Contexto para determinação fiscal
 export interface ContextoFiscal {
   tipo_obra?: TipoObraFiscal | null;
   tipo_cliente?: TipoClienteFiscal | null;
   tipo_operacao?: TipoOperacaoFiscal | null;
   data_referencia?: string;
 }
 
 // Cálculo de IVA
 export interface CalculoIVA {
   valor_base: number;
   taxa_iva: number;
   valor_iva: number;
   valor_total: number;
   regime: string;
   nota_legal: string | null;
 }
 
 // Configurações de labels para UI
 export const TIPO_OBRA_FISCAL_CONFIG: Record<TipoObraFiscal, { label: string; description: string }> = {
   construcao_nova: { label: 'Construção Nova', description: 'Construção de edifícios novos' },
   reabilitacao_urbana: { label: 'Reabilitação Urbana (ARU)', description: 'Obras em Áreas de Reabilitação Urbana' },
   renovacao_habitacao: { label: 'Renovação Habitação', description: 'Remodelação e reparação de habitações' },
   manutencao: { label: 'Manutenção', description: 'Manutenção e pequenas reparações' },
   obra_publica: { label: 'Obra Pública', description: 'Obras para entidades públicas' },
 };
 
 export const TIPO_CLIENTE_FISCAL_CONFIG: Record<TipoClienteFiscal, { label: string; description: string }> = {
   particular: { label: 'Particular', description: 'Pessoa singular' },
   empresa: { label: 'Empresa', description: 'Pessoa coletiva / Empresa' },
   construtor: { label: 'Construtor', description: 'Construtor com alvará válido' },
   entidade_publica: { label: 'Entidade Pública', description: 'Estado, autarquias, etc.' },
 };
 
 export const TIPO_OPERACAO_FISCAL_CONFIG: Record<TipoOperacaoFiscal, { label: string; description: string }> = {
   empreitada: { label: 'Empreitada', description: 'Empreitada de construção civil' },
   subempreitada: { label: 'Subempreitada', description: 'Subempreitada a outro construtor' },
   servicos: { label: 'Serviços', description: 'Prestação de serviços' },
   materiais: { label: 'Materiais', description: 'Fornecimento de materiais' },
   mao_obra: { label: 'Mão de Obra', description: 'Apenas mão de obra' },
 };
 
 export const REGIME_FISCAL_CONFIG: Record<RegimeFiscalTipo, { label: string; color: string; bgColor: string }> = {
   normal: { label: 'IVA Normal (23%)', color: 'text-blue-600', bgColor: 'bg-blue-100' },
   reduzido: { label: 'IVA Reduzido (6%)', color: 'text-green-600', bgColor: 'bg-green-100' },
   autoliquidacao: { label: 'Autoliquidação (0%)', color: 'text-orange-600', bgColor: 'bg-orange-100' },
   isento: { label: 'Isento', color: 'text-muted-foreground', bgColor: 'bg-muted' },
 };