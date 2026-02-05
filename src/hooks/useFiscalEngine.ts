 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { toast } from 'sonner';
 import type {
   RegimeFiscal,
   TaxaIVA,
   RegraFiscal,
   NotaLegalFiscal,
   OrcamentoContextoFiscal,
   AuditoriaFiscal,
   ResultadoFiscal,
   ContextoFiscal,
   CalculoIVA,
   TipoObraFiscal,
   TipoClienteFiscal,
   TipoOperacaoFiscal,
 } from '@/types/fiscal';
 
 // =============================================
 // HOOK: Motor Fiscal Portugal
 // =============================================
 export function useFiscalEngine() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   // =============================================
   // QUERIES: Dados de Referência
   // =============================================
 
   // Buscar todos os regimes fiscais
   const { data: regimes, isLoading: loadingRegimes } = useQuery({
     queryKey: ['regimes-fiscais'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('regimes_fiscais')
         .select('*')
         .eq('ativo', true)
         .order('codigo');
       if (error) throw error;
       return data as RegimeFiscal[];
     },
     enabled: !!user,
   });
 
   // Buscar taxas de IVA atuais
   const { data: taxas, isLoading: loadingTaxas } = useQuery({
     queryKey: ['taxas-iva'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('taxas_iva')
         .select('*, regime:regimes_fiscais(*)')
         .eq('ativo', true)
         .lte('data_inicio', new Date().toISOString().split('T')[0])
         .or('data_fim.is.null,data_fim.gte.' + new Date().toISOString().split('T')[0])
         .order('data_inicio', { ascending: false });
       if (error) throw error;
       return data as TaxaIVA[];
     },
     enabled: !!user,
   });
 
   // Buscar regras fiscais
   const { data: regras, isLoading: loadingRegras } = useQuery({
     queryKey: ['regras-fiscais'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('regras_fiscais')
         .select('*, regime:regimes_fiscais(*)')
         .eq('ativo', true)
         .lte('data_inicio', new Date().toISOString().split('T')[0])
         .or('data_fim.is.null,data_fim.gte.' + new Date().toISOString().split('T')[0])
         .order('prioridade');
       if (error) throw error;
       return data as RegraFiscal[];
     },
     enabled: !!user,
   });
 
   // Buscar notas legais
   const { data: notasLegais, isLoading: loadingNotas } = useQuery({
     queryKey: ['notas-legais-fiscais'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('notas_legais_fiscais')
         .select('*, regime:regimes_fiscais(*)')
         .eq('ativo', true)
         .order('ordem');
       if (error) throw error;
       return data as NotaLegalFiscal[];
     },
     enabled: !!user,
   });
 
   // =============================================
   // FUNÇÃO: Determinar Regime Fiscal (client-side)
   // =============================================
   const determinarRegimeFiscal = (contexto: ContextoFiscal): ResultadoFiscal | null => {
     if (!regras || !taxas || !notasLegais) return null;
 
     const { tipo_obra, tipo_cliente, tipo_operacao } = contexto;
 
     // Filtrar regras aplicáveis e ordenar por especificidade + prioridade
     const regrasAplicaveis = regras
       .filter((regra) => {
         // Verificar se a regra se aplica ao contexto
         const matchObra = !regra.tipo_obra || regra.tipo_obra === tipo_obra;
         const matchCliente = !regra.tipo_cliente || regra.tipo_cliente === tipo_cliente;
         const matchOperacao = !regra.tipo_operacao || regra.tipo_operacao === tipo_operacao;
         return matchObra && matchCliente && matchOperacao;
       })
       .sort((a, b) => {
         // Calcular especificidade (mais campos preenchidos = mais específico)
         const especificidadeA = (a.tipo_obra ? 1 : 0) + (a.tipo_cliente ? 1 : 0) + (a.tipo_operacao ? 1 : 0);
         const especificidadeB = (b.tipo_obra ? 1 : 0) + (b.tipo_cliente ? 1 : 0) + (b.tipo_operacao ? 1 : 0);
         
         // Maior especificidade primeiro
         if (especificidadeB !== especificidadeA) {
           return especificidadeB - especificidadeA;
         }
         // Depois por prioridade (menor = melhor)
         return a.prioridade - b.prioridade;
       });
 
     const regraAplicada = regrasAplicaveis[0];
 
     if (!regraAplicada) {
       // Fallback para regime normal
       const regimeNormal = regimes?.find((r) => r.codigo === 'NORMAL');
       const taxaNormal = taxas.find((t) => t.regime_id === regimeNormal?.id);
       const notaNormal = notasLegais.find((n) => n.regime_id === regimeNormal?.id && n.obrigatoria);
       
       return {
         regime_id: regimeNormal?.id || '',
         regime_codigo: 'NORMAL',
         regime_nome: 'IVA Normal',
         taxa_iva: taxaNormal?.percentagem || 23,
         regra_id: null,
         regra_codigo: 'DEFAULT_NORMAL',
         nota_legal: notaNormal?.texto || null,
       };
     }
 
     const taxa = taxas.find((t) => t.regime_id === regraAplicada.regime_id);
     const nota = notasLegais.find((n) => n.regime_id === regraAplicada.regime_id && n.obrigatoria);
     const regime = regraAplicada.regime;
 
     return {
       regime_id: regraAplicada.regime_id,
       regime_codigo: regime?.codigo || '',
       regime_nome: regime?.nome || '',
       taxa_iva: taxa?.percentagem || 23,
       regra_id: regraAplicada.id,
       regra_codigo: regraAplicada.codigo,
       nota_legal: nota?.texto || null,
     };
   };
 
   // =============================================
   // FUNÇÃO: Calcular IVA
   // =============================================
   const calcularIVA = (valorBase: number, contexto: ContextoFiscal): CalculoIVA => {
     const resultado = determinarRegimeFiscal(contexto);
     const taxaIva = resultado?.taxa_iva || 23;
     const valorIva = valorBase * (taxaIva / 100);
 
     return {
       valor_base: valorBase,
       taxa_iva: taxaIva,
       valor_iva: Math.round(valorIva * 100) / 100,
       valor_total: Math.round((valorBase + valorIva) * 100) / 100,
       regime: resultado?.regime_nome || 'IVA Normal',
       nota_legal: resultado?.nota_legal || null,
     };
   };
 
   // =============================================
   // QUERIES: Contexto Fiscal do Orçamento
   // =============================================
   const useOrcamentoContextoFiscal = (orcamentoId: string | undefined) => {
     return useQuery({
       queryKey: ['orcamento-contexto-fiscal', orcamentoId],
       queryFn: async () => {
         if (!orcamentoId) return null;
         const { data, error } = await supabase
           .from('orcamento_contexto_fiscal')
           .select('*, regime:regimes_fiscais(*), regra:regras_fiscais(*)')
           .eq('orcamento_id', orcamentoId)
           .maybeSingle();
         if (error) throw error;
         return data as OrcamentoContextoFiscal | null;
       },
       enabled: !!orcamentoId && !!user,
     });
   };
 
   // =============================================
   // MUTATIONS: Contexto Fiscal
   // =============================================
   const saveContextoFiscal = useMutation({
     mutationFn: async ({
       orcamentoId,
       tipoObra,
       tipoCliente,
       tipoOperacao,
     }: {
       orcamentoId: string;
       tipoObra?: TipoObraFiscal | null;
       tipoCliente?: TipoClienteFiscal | null;
       tipoOperacao?: TipoOperacaoFiscal | null;
     }) => {
       if (!user) throw new Error('Utilizador não autenticado');
 
       // Determinar regime fiscal automaticamente
       const resultado = determinarRegimeFiscal({
         tipo_obra: tipoObra,
         tipo_cliente: tipoCliente,
         tipo_operacao: tipoOperacao,
       });
 
       const contextoData = {
         orcamento_id: orcamentoId,
         tipo_obra: tipoObra || null,
         tipo_cliente: tipoCliente || null,
         tipo_operacao: tipoOperacao || null,
         regime_id: resultado?.regime_id || null,
         regra_aplicada_id: resultado?.regra_id || null,
         taxa_iva: resultado?.taxa_iva || 23,
         override_manual: false,
         user_id: user.id,
       };
 
       // Upsert
       const { data, error } = await supabase
         .from('orcamento_contexto_fiscal')
         .upsert(contextoData, { onConflict: 'orcamento_id' })
         .select()
         .single();
 
       if (error) throw error;
 
       // Registar auditoria
       await supabase.from('auditoria_fiscal').insert({
         user_id: user.id,
         entidade_tipo: 'orcamento',
         entidade_id: orcamentoId,
         acao: 'calculo_automatico',
         dados_novos: contextoData,
         regime_novo_id: resultado?.regime_id,
         taxa_nova: resultado?.taxa_iva,
       });
 
       return data;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['orcamento-contexto-fiscal', variables.orcamentoId] });
       toast.success('Contexto fiscal atualizado');
     },
     onError: (error) => {
       console.error('Erro ao guardar contexto fiscal:', error);
       toast.error('Erro ao guardar contexto fiscal');
     },
   });
 
   const overrideRegimeFiscal = useMutation({
     mutationFn: async ({
       orcamentoId,
       regimeId,
       justificacao,
     }: {
       orcamentoId: string;
       regimeId: string;
       justificacao: string;
     }) => {
       if (!user) throw new Error('Utilizador não autenticado');
 
       // Obter contexto atual para auditoria
       const { data: contextoAtual } = await supabase
         .from('orcamento_contexto_fiscal')
         .select('*')
         .eq('orcamento_id', orcamentoId)
         .single();
 
       // Obter taxa do novo regime
       const { data: taxa } = await supabase
         .from('taxas_iva')
         .select('percentagem')
         .eq('regime_id', regimeId)
         .eq('ativo', true)
         .lte('data_inicio', new Date().toISOString().split('T')[0])
         .order('data_inicio', { ascending: false })
         .limit(1)
         .single();
 
       const { data, error } = await supabase
         .from('orcamento_contexto_fiscal')
         .update({
           regime_id: regimeId,
           taxa_iva: taxa?.percentagem || 23,
           override_manual: true,
           override_justificacao: justificacao,
           override_por: user.id,
           override_em: new Date().toISOString(),
         })
         .eq('orcamento_id', orcamentoId)
         .select()
         .single();
 
       if (error) throw error;
 
       // Registar auditoria
       await supabase.from('auditoria_fiscal').insert({
         user_id: user.id,
         entidade_tipo: 'orcamento',
         entidade_id: orcamentoId,
         acao: 'override_manual',
         dados_anteriores: contextoAtual,
         dados_novos: data,
         regime_anterior_id: contextoAtual?.regime_id,
         regime_novo_id: regimeId,
         taxa_anterior: contextoAtual?.taxa_iva,
         taxa_nova: taxa?.percentagem,
         justificacao,
       });
 
       return data;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['orcamento-contexto-fiscal', variables.orcamentoId] });
       toast.warning('Regime fiscal alterado manualmente', {
         description: 'Esta alteração ficará registada na auditoria',
       });
     },
     onError: (error) => {
       console.error('Erro ao alterar regime fiscal:', error);
       toast.error('Erro ao alterar regime fiscal');
     },
   });
 
   // =============================================
   // QUERY: Auditoria Fiscal
   // =============================================
   const useAuditoriaFiscal = (entidadeTipo: string, entidadeId: string) => {
     return useQuery({
       queryKey: ['auditoria-fiscal', entidadeTipo, entidadeId],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('auditoria_fiscal')
           .select('*')
           .eq('entidade_tipo', entidadeTipo)
           .eq('entidade_id', entidadeId)
           .order('created_at', { ascending: false });
         if (error) throw error;
         return data as AuditoriaFiscal[];
       },
       enabled: !!entidadeId && !!user,
     });
   };
 
   // =============================================
   // HELPER: Obter nota legal por regime
   // =============================================
   const getNotaLegalPorRegime = (regimeId: string): string | null => {
     const nota = notasLegais?.find((n) => n.regime_id === regimeId && n.obrigatoria);
     return nota?.texto || null;
   };
 
   // =============================================
   // HELPER: Obter taxa atual por regime
   // =============================================
   const getTaxaPorRegime = (regimeId: string): number => {
     const taxa = taxas?.find((t) => t.regime_id === regimeId);
     return taxa?.percentagem || 23;
   };
 
   return {
     // Dados de referência
     regimes,
     taxas,
     regras,
     notasLegais,
     
     // Estados de loading
     isLoading: loadingRegimes || loadingTaxas || loadingRegras || loadingNotas,
 
     // Funções do motor
     determinarRegimeFiscal,
     calcularIVA,
 
     // Hooks para contexto fiscal
     useOrcamentoContextoFiscal,
     useAuditoriaFiscal,
 
     // Mutations
     saveContextoFiscal,
     overrideRegimeFiscal,
 
     // Helpers
     getNotaLegalPorRegime,
     getTaxaPorRegime,
   };
 }