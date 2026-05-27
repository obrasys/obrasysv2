-- Normalizar useful_percent existente: valores > 1 são percentagens (0-100) → converter para fracção (0-1)
UPDATE public.closing_sheet_site_detail_lines
SET useful_percent = useful_percent / 100
WHERE useful_percent > 1;