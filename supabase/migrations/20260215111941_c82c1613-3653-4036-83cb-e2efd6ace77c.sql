
-- Clientes podem ver obras onde tem acesso ativo
CREATE POLICY "Clients can view assigned obras"
ON public.obras FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_obra_access
    WHERE client_user_id = auth.uid()
      AND obra_id = obras.id
      AND ativo = true
  )
);

-- Clientes podem ver RDOs submetidos/aprovados
CREATE POLICY "Clients can view RDOs of assigned obras"
ON public.relatorios_diarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_obra_access
    WHERE client_user_id = auth.uid()
      AND obra_id = relatorios_diarios.obra_id
      AND ativo = true
  )
  AND status IN ('submetido', 'aprovado')
);

-- Clientes podem ver progresso
CREATE POLICY "Clients can view progress of assigned obras"
ON public.obra_progress_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_obra_access
    WHERE client_user_id = auth.uid()
      AND obra_id = obra_progress_tracking.obra_id
      AND ativo = true
  )
);
