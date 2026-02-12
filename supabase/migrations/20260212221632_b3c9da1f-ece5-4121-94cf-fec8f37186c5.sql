
-- Create client_obra_access table
CREATE TABLE public.client_obra_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  granted_by UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  client_email TEXT,
  client_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_user_id, obra_id)
);

-- Enable RLS
ALTER TABLE public.client_obra_access ENABLE ROW LEVEL SECURITY;

-- Policy: obra owners can manage access
CREATE POLICY "Obra owners can manage client access"
ON public.client_obra_access
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.obras
    WHERE obras.id = client_obra_access.obra_id
    AND obras.user_id = auth.uid()
  )
);

-- Policy: clients can see their own access
CREATE POLICY "Clients can view their own access"
ON public.client_obra_access
FOR SELECT
USING (client_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_client_obra_access_updated_at
BEFORE UPDATE ON public.client_obra_access
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
