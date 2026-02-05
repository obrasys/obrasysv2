 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
 
 interface ResumoIVAPeriodo {
   periodo: string;
   regime: string;
   taxa: number;
   base_tributavel: number;
   valor_iva: number;
   total_com_iva: number;
   count: number;
 }
 
 interface RelatorioIVA {
   periodo_inicio: string;
   periodo_fim: string;
   resumo_por_regime: ResumoIVAPeriodo[];
   total_base: number;
   total_iva: number;
   total_geral: number;
   total_documentos: number;
 }
 
 export function useFiscalReports() {
   const { user } = useAuth();
 
   // Relatório de IVA por período
   const useRelatorioIVA = (dataInicio: Date, dataFim: Date) => {
     return useQuery({
       queryKey: ['relatorio-iva', format(dataInicio, 'yyyy-MM-dd'), format(dataFim, 'yyyy-MM-dd')],
       queryFn: async (): Promise<RelatorioIVA> => {
         // Buscar contextos fiscais dos orçamentos com datas de envio no período
         const { data: orcamentos, error: orcError } = await supabase
           .from('orcamentos')
           .select(`
             id,
             titulo,
             valor_total,
             margem_lucro,
             custos_indiretos,
             data_envio,
             status
           `)
           .gte('data_envio', format(dataInicio, 'yyyy-MM-dd'))
           .lte('data_envio', format(dataFim, 'yyyy-MM-dd'))
           .in('status', ['enviado', 'aprovado', 'adjudicado']);
 
         if (orcError) throw orcError;
 
         // Buscar contextos fiscais
         const orcamentoIds = orcamentos?.map((o) => o.id) || [];
         const { data: contextos, error: ctxError } = await supabase
           .from('orcamento_contexto_fiscal')
           .select(`
             orcamento_id,
             taxa_iva,
             regime:regimes_fiscais(codigo, nome)
           `)
           .in('orcamento_id', orcamentoIds);
 
         if (ctxError) throw ctxError;
 
         // Mapear contextos por orçamento
         const contextoMap = new Map(contextos?.map((c) => [c.orcamento_id, c]));
 
         // Agrupar por regime
         const resumoPorRegime = new Map<string, ResumoIVAPeriodo>();
 
         for (const orc of orcamentos || []) {
           const ctx = contextoMap.get(orc.id);
           const taxaIva = ctx?.taxa_iva ?? 23;
           const regimeCodigo = (ctx?.regime as { codigo?: string })?.codigo || 'NORMAL';
           const regimeNome = (ctx?.regime as { nome?: string })?.nome || 'IVA Normal';
 
           // Calcular base tributável (com margem aplicada)
           const custosIndiretos = orc.custos_indiretos as Record<string, number> | null;
           const custosIndiretosTotal =
             (custosIndiretos?.estaleiro || 0) +
             (custosIndiretos?.seguros || 0) +
             (custosIndiretos?.licenciamento || 0);
           const margemDecimal = (orc.margem_lucro || 0) / 100;
           const baseTributavel = (orc.valor_total + custosIndiretosTotal) * (1 + margemDecimal);
           const valorIva = baseTributavel * (taxaIva / 100);
 
           const key = `${regimeCodigo}_${taxaIva}`;
           const existing = resumoPorRegime.get(key);
 
           if (existing) {
             existing.base_tributavel += baseTributavel;
             existing.valor_iva += valorIva;
             existing.total_com_iva += baseTributavel + valorIva;
             existing.count += 1;
           } else {
             resumoPorRegime.set(key, {
               periodo: `${format(dataInicio, 'yyyy-MM-dd')} a ${format(dataFim, 'yyyy-MM-dd')}`,
               regime: regimeNome,
               taxa: taxaIva,
               base_tributavel: baseTributavel,
               valor_iva: valorIva,
               total_com_iva: baseTributavel + valorIva,
               count: 1,
             });
           }
         }
 
         const resumoArray = Array.from(resumoPorRegime.values()).sort((a, b) => b.taxa - a.taxa);
 
         const totalBase = resumoArray.reduce((sum, r) => sum + r.base_tributavel, 0);
         const totalIva = resumoArray.reduce((sum, r) => sum + r.valor_iva, 0);
 
         return {
           periodo_inicio: format(dataInicio, 'yyyy-MM-dd'),
           periodo_fim: format(dataFim, 'yyyy-MM-dd'),
           resumo_por_regime: resumoArray,
           total_base: Math.round(totalBase * 100) / 100,
           total_iva: Math.round(totalIva * 100) / 100,
           total_geral: Math.round((totalBase + totalIva) * 100) / 100,
           total_documentos: orcamentos?.length || 0,
         };
       },
       enabled: !!user,
     });
   };
 
   // Relatório mensal rápido (mês atual)
   const useRelatorioMesAtual = () => {
     const hoje = new Date();
     const inicioMes = startOfMonth(hoje);
     const fimMes = endOfMonth(hoje);
     return useRelatorioIVA(inicioMes, fimMes);
   };
 
   // Auditoria fiscal recente
   const useAuditoriaRecente = (limite = 20) => {
     return useQuery({
       queryKey: ['auditoria-fiscal-recente', limite],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('auditoria_fiscal')
           .select('*')
           .order('created_at', { ascending: false })
           .limit(limite);
         if (error) throw error;
         return data;
       },
       enabled: !!user,
     });
   };
 
   return {
     useRelatorioIVA,
     useRelatorioMesAtual,
     useAuditoriaRecente,
   };
 }