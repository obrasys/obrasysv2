-- Adicionar novos campos à tabela obras
ALTER TABLE public.obras 
ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS gestor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS progresso numeric NOT NULL DEFAULT 0;

-- Criar tabela para tracking de progresso da obra
CREATE TABLE public.obra_progress_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  capitulo_id uuid REFERENCES public.capitulos_orcamento(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  quantidade_prevista numeric NOT NULL DEFAULT 0,
  quantidade_executada numeric NOT NULL DEFAULT 0,
  percentagem numeric NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'un',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.obra_progress_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for obra_progress_tracking
CREATE POLICY "Users can view progress of their obras"
ON public.obra_progress_tracking
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.obras o
  WHERE o.id = obra_progress_tracking.obra_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can create progress for their obras"
ON public.obra_progress_tracking
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.obras o
  WHERE o.id = obra_progress_tracking.obra_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can update progress of their obras"
ON public.obra_progress_tracking
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.obras o
  WHERE o.id = obra_progress_tracking.obra_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can delete progress of their obras"
ON public.obra_progress_tracking
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.obras o
  WHERE o.id = obra_progress_tracking.obra_id AND o.user_id = auth.uid()
));

-- Create trigger to update updated_at
CREATE TRIGGER update_obra_progress_tracking_updated_at
BEFORE UPDATE ON public.obra_progress_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-calculate obra progress based on tracking
CREATE OR REPLACE FUNCTION public.calculate_obra_progress()
RETURNS TRIGGER AS $$
DECLARE
  avg_progress numeric;
BEGIN
  -- Calculate average progress for the obra
  SELECT COALESCE(AVG(percentagem), 0) INTO avg_progress
  FROM public.obra_progress_tracking
  WHERE obra_id = COALESCE(NEW.obra_id, OLD.obra_id);
  
  -- Update obra progress
  UPDATE public.obras
  SET progresso = avg_progress, updated_at = now()
  WHERE id = COALESCE(NEW.obra_id, OLD.obra_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-calculate progress
CREATE TRIGGER calculate_obra_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.obra_progress_tracking
FOR EACH ROW
EXECUTE FUNCTION public.calculate_obra_progress();