DELETE FROM public.matriz_capitulos_padrao;
INSERT INTO public.matriz_capitulos_padrao (codigo, titulo, ordem, ativo)
SELECT code, name, sort_order, true
FROM public.budget_chapter_templates
WHERE company_id IS NULL
ORDER BY sort_order;