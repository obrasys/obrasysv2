import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { AdjudicacaoFormData } from '@/types/adjudicacao';

export function useAdjudicacao(budgetId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing award for this budget
  const { data: award, isLoading: loadingAward } = useQuery({
    queryKey: ['budget-award', budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data, error } = await supabase
        .from('budget_awards')
        .select('*')
        .eq('budget_id', budgetId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });

  // Fetch payment plans for an award
  const { data: paymentPlans } = useQuery({
    queryKey: ['budget-payment-plans', award?.id],
    queryFn: async () => {
      if (!award?.id) return [];
      const { data, error } = await supabase
        .from('budget_payment_plans')
        .select('*')
        .eq('budget_award_id', award.id)
        .order('installment_no');
      if (error) throw error;
      return data || [];
    },
    enabled: !!award?.id,
  });

  // Fetch receivables for this budget
  const { data: receivables } = useQuery({
    queryKey: ['budget-receivables', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from('receivables')
        .select('*')
        .eq('source_id', budgetId)
        .eq('source_type', 'budget_award')
        .order('due_date');
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });

  // Main adjudicar mutation
  const adjudicar = useMutation({
    mutationFn: async ({
      formData,
      orcamento,
    }: {
      formData: AdjudicacaoFormData;
      orcamento: { id: string; obra_id: string | null; cliente_id?: string | null; titulo: string; valor_total: number };
    }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const remaining = formData.awarded_total_amount - formData.deposit_amount;

      // 1. Ensure obra exists - create if needed
      let obraId = orcamento.obra_id;
      if (!obraId) {
        const { data: novaObra, error: obraError } = await supabase
          .from('obras')
          .insert({
            user_id: user.id,
            nome: orcamento.titulo,
            status: 'planeamento',
            valor_previsto: formData.awarded_total_amount,
          })
          .select()
          .single();
        if (obraError) throw obraError;
        obraId = novaObra.id;

        // Link obra to orcamento
        await supabase.from('orcamentos').update({ obra_id: obraId }).eq('id', orcamento.id);
      }

      // 2. Create budget award
      const { data: awardData, error: awardError } = await supabase
        .from('budget_awards')
        .insert({
          user_id: user.id,
          budget_id: orcamento.id,
          obra_id: obraId,
          awarded_by_user_id: user.id,
          awarded_at: formData.awarded_at,
          awarded_total_amount: formData.awarded_total_amount,
          deposit_amount: formData.deposit_amount,
          deposit_percent: formData.deposit_percent,
          remaining_amount: remaining,
          notes: formData.notes || null,
          status: 'active',
        })
        .select()
        .single();
      if (awardError) throw awardError;

      // 3. Create payment plan installments
      if (formData.installments.length > 0) {
        const installmentsData = formData.installments.map((inst, idx) => ({
          user_id: user.id,
          budget_award_id: awardData.id,
          obra_id: obraId,
          installment_no: idx + 1,
          label: inst.label,
          due_date: inst.due_date,
          percent_of_award: inst.percent,
          amount: inst.amount,
          status: 'pending',
        }));

        const { error: planError } = await supabase
          .from('budget_payment_plans')
          .insert(installmentsData);
        if (planError) throw planError;
      }

      // 4. Create receivables
      const receivablesToCreate = [];
      const today = new Date().toISOString().split('T')[0];

      // Deposit receivable (if any deposit)
      if (formData.deposit_amount > 0) {
        receivablesToCreate.push({
          user_id: user.id,
          obra_id: obraId,
          client_id: orcamento.cliente_id || null,
          source_type: 'budget_award',
          source_id: orcamento.id,
          title: `Sinal - ${orcamento.titulo}`,
          description: `Pagamento de sinal na adjudicação`,
          issue_date: today,
          due_date: formData.awarded_at,
          amount: formData.deposit_amount,
          status: 'paid',
          paid_amount: formData.deposit_amount,
          remaining_amount: 0,
        });
      }

      // Installment receivables
      for (const inst of formData.installments) {
        receivablesToCreate.push({
          user_id: user.id,
          obra_id: obraId,
          client_id: orcamento.cliente_id || null,
          source_type: 'budget_award',
          source_id: orcamento.id,
          title: `${inst.label} - ${orcamento.titulo}`,
          description: `Parcela do plano de pagamento`,
          issue_date: today,
          due_date: inst.due_date,
          amount: inst.amount,
          status: 'pending',
          paid_amount: 0,
          remaining_amount: inst.amount,
        });
      }

      if (receivablesToCreate.length > 0) {
        const { data: createdReceivables, error: recError } = await supabase
          .from('receivables')
          .insert(receivablesToCreate)
          .select();
        if (recError) throw recError;

        // 5. Create payment record for deposit
        if (formData.deposit_amount > 0 && createdReceivables && createdReceivables.length > 0) {
          const depositReceivable = createdReceivables[0];
          await supabase.from('receivable_payments').insert({
            user_id: user.id,
            receivable_id: depositReceivable.id,
            obra_id: obraId,
            payment_date: formData.awarded_at,
            amount: formData.deposit_amount,
            payment_method: 'transferencia',
            notes: 'Pagamento de sinal na adjudicação',
          });
        }

        // 6. Create alerts for installments (5 days before due date)
        const alertsToCreate = createdReceivables
          ?.filter(r => r.status === 'pending')
          .map(r => {
            const dueDate = new Date(r.due_date);
            const alertDate = new Date(dueDate);
            alertDate.setDate(alertDate.getDate() - 5);
            return {
              user_id: user.id,
              receivable_id: r.id,
              alert_type: 'due_soon',
              scheduled_for: alertDate.toISOString(),
              status: 'pending',
              channel: 'in_app',
            };
          }) || [];

        if (alertsToCreate.length > 0) {
          await supabase.from('receivable_alerts').insert(alertsToCreate);
        }
      }

      // 7. Also create financial records (contas_financeiras) for the obra
      if (formData.deposit_amount > 0) {
        await supabase.from('contas_financeiras').insert({
          user_id: user.id,
          obra_id: obraId,
          tipo: 'receber',
          origem: 'outros',
          valor: formData.deposit_amount,
          descricao: `Sinal - Adjudicação ${orcamento.titulo}`,
          data_vencimento: formData.awarded_at,
          pago: true,
          data_pagamento: formData.awarded_at,
          cliente_id: orcamento.cliente_id || null,
        });
      }

      for (const inst of formData.installments) {
        await supabase.from('contas_financeiras').insert({
          user_id: user.id,
          obra_id: obraId,
          tipo: 'receber',
          origem: 'outros',
          valor: inst.amount,
          descricao: `${inst.label} - ${orcamento.titulo}`,
          data_vencimento: inst.due_date,
          pago: false,
          cliente_id: orcamento.cliente_id || null,
        });
      }

      // 8. Update orcamento status to adjudicado
      await supabase
        .from('orcamentos')
        .update({ status: 'adjudicado', valor_adjudicado: formData.awarded_total_amount })
        .eq('id', orcamento.id);

      // 9. Try to create client portal access
      try {
        const { data: session } = await supabase.auth.getSession();
        await supabase.functions.invoke('create-client-portal-access', {
          body: { orcamento_id: orcamento.id, obra_id: obraId },
          headers: session?.session?.access_token
            ? { Authorization: `Bearer ${session.session.access_token}` }
            : undefined,
        });
      } catch {
        // Non-critical
      }

      // 10. Generate estimated schedule (Planeamento) via Axia
      try {
        const { data: session } = await supabase.auth.getSession();
        await supabase.functions.invoke('generate-estimated-schedule', {
          body: {
            obra_id: obraId,
            budget_id: orcamento.id,
            user_id: user.id,
            awarded_amount: formData.awarded_total_amount,
            awarded_at: formData.awarded_at,
          },
          headers: session?.session?.access_token
            ? { Authorization: `Bearer ${session.session.access_token}` }
            : undefined,
        });
      } catch {
        // Non-critical - schedule generation failure should not block adjudication
        console.warn('Falha na geração automática do planeamento');
      }

      return awardData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['orcamento'] });
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['contas-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budget-award'] });
      queryClient.invalidateQueries({ queryKey: ['budget-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-versions'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
      toast({
        title: 'Orçamento adjudicado com sucesso!',
        description: 'Obra, plano de pagamento, contas a receber e planeamento estimado (Axia™) foram criados automaticamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na adjudicação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    award,
    paymentPlans,
    receivables,
    loadingAward,
    adjudicar,
  };
}
