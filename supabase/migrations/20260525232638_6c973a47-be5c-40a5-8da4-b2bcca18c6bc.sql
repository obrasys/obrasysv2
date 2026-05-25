
-- 1. Decomposição de custo por artigo (6 componentes)
ALTER TABLE public.artigos_orcamento
  ADD COLUMN IF NOT EXISTS custo_mo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_mat numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_sub numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_srv numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_alu numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_div numeric NOT NULL DEFAULT 0;

-- 2. Matriz padrão de capítulos (00 → 036) — system seed
CREATE TABLE IF NOT EXISTS public.matriz_capitulos_padrao (
  codigo text PRIMARY KEY,
  ordem integer NOT NULL,
  titulo text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matriz_capitulos_padrao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matriz leitura autenticados" ON public.matriz_capitulos_padrao;
CREATE POLICY "matriz leitura autenticados"
ON public.matriz_capitulos_padrao FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "matriz escrita super admins" ON public.matriz_capitulos_padrao;
CREATE POLICY "matriz escrita super admins"
ON public.matriz_capitulos_padrao FOR ALL
TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Seed 37 capítulos (00 → 036) — matriz fixa PT
INSERT INTO public.matriz_capitulos_padrao (codigo, ordem, titulo) VALUES
  ('00',  0,  'Estaleiro e Trabalhos Preparatórios'),
  ('01',  1,  'Demolições'),
  ('02',  2,  'Movimento de Terras'),
  ('03',  3,  'Contenções e Trabalhos Periféricos'),
  ('04',  4,  'Fundações'),
  ('05',  5,  'Estruturas de Betão Armado'),
  ('06',  6,  'Estruturas Metálicas'),
  ('07',  7,  'Estruturas de Madeira'),
  ('08',  8,  'Alvenarias'),
  ('09',  9,  'Cantarias'),
  ('010', 10, 'Coberturas'),
  ('011', 11, 'Isolamentos e Impermeabilizações'),
  ('012', 12, 'Revestimentos Exteriores'),
  ('013', 13, 'Revestimentos Interiores de Paredes'),
  ('014', 14, 'Revestimentos de Tetos'),
  ('015', 15, 'Revestimentos de Pavimentos'),
  ('016', 16, 'Carpintarias'),
  ('017', 17, 'Caixilharias Exteriores e Vidros'),
  ('018', 18, 'Serralharias'),
  ('019', 19, 'Pinturas e Acabamentos'),
  ('020', 20, 'Louças e Equipamento Sanitário'),
  ('021', 21, 'Equipamento de Cozinha'),
  ('022', 22, 'Mobiliário Fixo'),
  ('023', 23, 'Instalações Hidráulicas (Águas e Esgotos)'),
  ('024', 24, 'Instalações de Gás'),
  ('025', 25, 'Instalações Elétricas e ITED'),
  ('026', 26, 'Instalações de AVAC'),
  ('027', 27, 'Instalações de Segurança e Deteção'),
  ('028', 28, 'Elevadores e Plataformas'),
  ('029', 29, 'Piscinas e Equipamento Hídrico'),
  ('030', 30, 'Energias Renováveis e Eficiência'),
  ('031', 31, 'Arranjos Exteriores e Jardinagem'),
  ('032', 32, 'Pavimentações Exteriores'),
  ('033', 33, 'Redes Exteriores e Ramais'),
  ('034', 34, 'Higiene, Segurança e Saúde em Obra'),
  ('035', 35, 'Gestão de Resíduos de Construção'),
  ('036', 36, 'Diversos e Imprevistos')
ON CONFLICT (codigo) DO UPDATE SET
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo;

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_matriz_capitulos_padrao_updated_at ON public.matriz_capitulos_padrao;
CREATE TRIGGER update_matriz_capitulos_padrao_updated_at
BEFORE UPDATE ON public.matriz_capitulos_padrao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Função para aplicar matriz a um orçamento existente (idempotente)
CREATE OR REPLACE FUNCTION public.aplicar_matriz_capitulos(p_orcamento_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inseridos integer := 0;
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.orcamentos WHERE id = p_orcamento_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;

  INSERT INTO public.capitulos_orcamento (orcamento_id, numero, titulo, ordem, valor_total)
  SELECT p_orcamento_id, m.ordem, m.codigo || ' — ' || m.titulo, m.ordem, 0
  FROM public.matriz_capitulos_padrao m
  WHERE m.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM public.capitulos_orcamento c
      WHERE c.orcamento_id = p_orcamento_id AND c.ordem = m.ordem
    );

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;
  RETURN v_inseridos;
END;
$$;
