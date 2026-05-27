
-- ============================================================
-- ICF HOMEBLOCK — Biblioteca Técnica + Mapa Visual de Panos
-- ============================================================

-- 1. icf_block_library
CREATE TABLE public.icf_block_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid,  -- NULL = item semente global (HOMEBLOCK oficial)
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('bloco_principal','topo','espacador','detalhe_tecnico','canto','meio_bloco','especial')),
  length_mm numeric(10,2),
  height_mm numeric(10,2),
  thickness_mm numeric(10,2),
  module_mm numeric(10,2),
  drawing_file text,
  can_be_cut boolean NOT NULL DEFAULT false,
  use_case text,
  notes text,
  system_seed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, code)
);

CREATE INDEX idx_icf_block_library_empresa ON public.icf_block_library(empresa_id);
CREATE INDEX idx_icf_block_library_category ON public.icf_block_library(category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_block_library TO authenticated;
GRANT ALL ON public.icf_block_library TO service_role;

ALTER TABLE public.icf_block_library ENABLE ROW LEVEL SECURITY;

-- Leitura: seed global (empresa_id NULL) ou itens da própria org
CREATE POLICY "icf_block_library_select" ON public.icf_block_library FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR empresa_id = public.get_user_org_id());
CREATE POLICY "icf_block_library_insert" ON public.icf_block_library FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id() AND system_seed = false);
CREATE POLICY "icf_block_library_update" ON public.icf_block_library FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_org_id() AND system_seed = false);
CREATE POLICY "icf_block_library_delete" ON public.icf_block_library FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_org_id() AND system_seed = false);

CREATE TRIGGER update_icf_block_library_updated_at
  BEFORE UPDATE ON public.icf_block_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed HOMEBLOCK (visível para todas as orgs)
INSERT INTO public.icf_block_library (empresa_id, code, name, category, length_mm, height_mm, thickness_mm, module_mm, drawing_file, can_be_cut, use_case, notes, system_seed) VALUES
  (NULL, 'HB-BLOCO-220', 'HOMEBLOCK Bloco 22 cm', 'bloco_principal', 900, 270, 220, 75, '/icf/homeblock/homeblock-bloco-220mm.svg', true, 'Paredes ICF com espessura de 22 cm', 'Bloco principal HOMEBLOCK com comprimento de 900 mm, altura de 270 mm e espessura de 220 mm.', true),
  (NULL, 'HB-BLOCO-300', 'HOMEBLOCK Bloco 30 cm', 'bloco_principal', 900, 270, 300, 75, '/icf/homeblock/homeblock-bloco-300mm.svg', true, 'Paredes ICF com espessura de 30 cm', 'Bloco principal HOMEBLOCK com comprimento de 900 mm, altura de 270 mm e espessura de 300 mm.', true),
  (NULL, 'HB-TOPO-150', 'HOMEBLOCK Topo 15 cm', 'topo', 150, 270, 150, NULL, '/icf/homeblock/homeblock-topo-150mm.svg', true, 'Peça de topo/remate para sistema de 15 cm', 'Peça de topo HOMEBLOCK para remates e ajustes.', true),
  (NULL, 'HB-TOPO-220', 'HOMEBLOCK Topo 22 cm', 'topo', 220, 270, 220, NULL, '/icf/homeblock/homeblock-topo-220mm.svg', true, 'Peça de topo/remate para sistema de 22 cm', 'Peça de topo HOMEBLOCK para remates e ajustes.', true),
  (NULL, 'HB-ESP-150', 'HOMEBLOCK Espaçador 15 cm', 'espacador', 216, 265, 30, NULL, '/icf/homeblock/homeblock-espacador-150mm.svg', false, 'Espaçador interno para sistema de 15 cm', 'Espaçador usado para manter o afastamento interno do sistema ICF.', true),
  (NULL, 'HB-ESP-220', 'HOMEBLOCK Espaçador 22 cm', 'espacador', 286, 265, 30, NULL, '/icf/homeblock/homeblock-espacador-220mm.svg', false, 'Espaçador interno para sistema de 22 cm', 'Espaçador usado para manter o afastamento interno do sistema ICF.', true),
  (NULL, 'HB-DET-CORTE', 'HOMEBLOCK Detalhes de Corte', 'detalhe_tecnico', NULL, NULL, NULL, NULL, '/icf/homeblock/homeblock-detalhes-corte.svg', false, 'Referência visual para cortes, encaixes e detalhes técnicos', 'Desenho técnico com detalhes de corte e encaixe do sistema HOMEBLOCK.', true);


-- 2. icf_wall_panels (Mapa Visual)
CREATE TABLE public.icf_wall_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL DEFAULT public.get_user_org_id(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  configuracao_id uuid REFERENCES public.icf_configuracoes(id) ON DELETE SET NULL,
  source_pano_id uuid REFERENCES public.icf_panos_parede(id) ON DELETE SET NULL,
  label text NOT NULL,
  floor text,
  room text,
  length_m numeric(10,3) NOT NULL,
  height_m numeric(10,3) NOT NULL,
  thickness_mm numeric(10,2) NOT NULL,
  selected_block_code text NOT NULL,
  openings jsonb NOT NULL DEFAULT '[]'::jsonb,
  gross_area_m2 numeric(12,3) GENERATED ALWAYS AS (length_m * height_m) STORED,
  net_area_m2 numeric(12,3),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','validado','enviado_orcamento','bloqueado')),
  confidence numeric(5,2),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('axia','manual','corrigido')),
  composition_result jsonb,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_icf_wall_panels_obra ON public.icf_wall_panels(obra_id);
CREATE INDEX idx_icf_wall_panels_empresa ON public.icf_wall_panels(empresa_id);
CREATE INDEX idx_icf_wall_panels_config ON public.icf_wall_panels(configuracao_id);
CREATE INDEX idx_icf_wall_panels_status ON public.icf_wall_panels(obra_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.icf_wall_panels TO authenticated;
GRANT ALL ON public.icf_wall_panels TO service_role;

ALTER TABLE public.icf_wall_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icf_wall_panels_select" ON public.icf_wall_panels FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_wall_panels_insert" ON public.icf_wall_panels FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_wall_panels_update" ON public.icf_wall_panels FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_org_id());
CREATE POLICY "icf_wall_panels_delete" ON public.icf_wall_panels FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_org_id());

CREATE TRIGGER update_icf_wall_panels_updated_at
  BEFORE UPDATE ON public.icf_wall_panels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
