
-- Make room
UPDATE public.budget_chapter_templates SET sort_order = sort_order + 1000 WHERE company_id IS NULL;

-- Repurpose existing 01 → 01.a (Trabalhos Preparatórios e Implantação)
UPDATE public.budget_chapter_templates
SET code = '01.a', name = 'TRABALHOS PREPARATÓRIOS E IMPLANTAÇÃO', sort_order = 2
WHERE code = '01' AND company_id IS NULL;

-- New "00 — Requisitos Gerais"
INSERT INTO public.budget_chapter_templates (code, name, sort_order, company_id, is_default, active)
VALUES ('00', 'REQUISITOS GERAIS', 1, NULL, true, true);

-- New "01.b — Estaleiro" and move estaleiro-related articles to it
DO $$
DECLARE v_01b uuid;
BEGIN
  INSERT INTO public.budget_chapter_templates (code, name, sort_order, company_id, is_default, active)
  VALUES ('01.b', 'ESTALEIRO', 3, NULL, true, true)
  RETURNING id INTO v_01b;

  UPDATE public.budget_article_templates
  SET chapter_template_id = v_01b
  WHERE code IN ('01.001','01.002','01.003','01.004','01.006','01.007','01.008');
END $$;

-- Renumber remaining shifted chapters back to clean order (starting at 4)
UPDATE public.budget_chapter_templates
SET sort_order = sort_order - 1000 + 2
WHERE company_id IS NULL AND sort_order > 1000;
