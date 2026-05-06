
CREATE TABLE public.icf_budget_chapter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  capitulos JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_referencia NUMERIC(14,2) DEFAULT 0,
  is_global BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.icf_budget_chapter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or global templates"
  ON public.icf_budget_chapter_templates FOR SELECT
  USING (is_global = true OR auth.uid() = user_id);

CREATE POLICY "Insert own templates"
  ON public.icf_budget_chapter_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_global = false);

CREATE POLICY "Update own templates"
  ON public.icf_budget_chapter_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_global = false);

CREATE POLICY "Delete own templates"
  ON public.icf_budget_chapter_templates FOR DELETE
  USING (auth.uid() = user_id AND is_global = false);

CREATE POLICY "Super admin manage global templates"
  ON public.icf_budget_chapter_templates FOR ALL
  USING (is_global = true AND public.is_super_admin())
  WITH CHECK (is_global = true AND public.is_super_admin());

CREATE TRIGGER icf_tpl_updated_at
  BEFORE UPDATE ON public.icf_budget_chapter_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.icf_budget_chapter_templates (nome, descricao, is_global, total_referencia, capitulos)
VALUES (
  'Chave-na-mão (Ferreira & Alcântara)',
  'Template moradia ICF ''chave na mão'' baseado em orçamento de referência (530 350 €). Valores fixos editáveis por capítulo.',
  true,
  530350,
  '[
    {"titulo":"Estaleiros e Escavações","descricao":"Preparação de estaleiro, marcação e escavação às cotas necessárias para construção em ICF.","valor":39850,"prazo":"1 a 2 meses"},
    {"titulo":"Estrutura","descricao":"Construção de estrutura em ICF conforme projeto de estabilidade (Homeblock). Inclui projeto se cliente não tiver.","valor":145000,"prazo":"2º ao 5º mês"},
    {"titulo":"Alvenarias","descricao":"Blocos de cânhamo em paredes interiores; bloco de betão/cerâmico nos muros exteriores.","valor":35000,"prazo":"3º ao 5º mês"},
    {"titulo":"Cobertura","descricao":"Cobertura conforme projeto, com laje em alternativa no sistema ICF Homeblock.","valor":23000,"prazo":"4º ao 5º mês"},
    {"titulo":"Instalações Elétricas e ITED","descricao":"Aparelhagem, cabos, quadros, projetores LED e 6 pontos de luz exterior a combinar.","valor":19500,"prazo":"5º ao 12º mês"},
    {"titulo":"Gás e Canalização","descricao":"Rede AQ/AF multicamada, esgotos PVC com retorno, bomba de calor, VMC, pré-instalação A/C, 4 pontos água exterior.","valor":18500,"prazo":"5º ao 12º mês"},
    {"titulo":"Caixilharia","descricao":"Caixilharia em PVC (alumínio +30%), com estores elétricos térmicos.","valor":42000,"prazo":"5º ao 7º mês"},
    {"titulo":"Betonilhas","descricao":"Betonilha com manta térmica e enchimento conforme projeto.","valor":15000,"prazo":"6º mês"},
    {"titulo":"Cozinhas","descricao":"Cozinha lacada branca com pedra Silestone (ou alternativa), forno e placa AEG/Zanussi.","valor":16000,"prazo":"7º ao 8º mês"},
    {"titulo":"Carpintarias / Serralharias","descricao":"Portão homem/garagem, porta exterior, portas interiores cor.","valor":36000,"prazo":"7º ao 10º mês"},
    {"titulo":"Revestimentos de Paredes, Tetos e Pavimentos","descricao":"Estuque projetado interior, capoto exterior, cerâmicos até 22€/m², tetos falsos em gesso cartonado.","valor":48000,"prazo":"6º ao 10º mês"},
    {"titulo":"WC com Loiças","descricao":"Sanitas (320€), duches em continuação do chão, torneiras (35€), móvel de bancada (até 350€).","valor":9500,"prazo":"9º ao 10º mês"},
    {"titulo":"Pintura","descricao":"Tintas CIN ou equivalente, exterior e interior.","valor":36000,"prazo":"8º ao 12º mês"},
    {"titulo":"Piscina","descricao":"Conforme projeto e anexos enviados.","valor":25000,"prazo":""},
    {"titulo":"Trabalhos Exteriores","descricao":"Acabamentos exteriores conforme projeto de arquitetura.","valor":22000,"prazo":"7º ao 12º mês"}
  ]'::jsonb
);
