ALTER TABLE public.closing_sheet_site_detail_lines
  DROP CONSTRAINT IF EXISTS closing_sheet_site_detail_lines_category_check;

ALTER TABLE public.closing_sheet_site_detail_lines
  ADD CONSTRAINT closing_sheet_site_detail_lines_category_check
  CHECK (category = ANY (ARRAY[
    'technical_staff',
    'site_supervisors',
    'team_leaders',
    'utilities',
    'site_equipment',
    'site_guard',
    'site_labor',
    'other_site_costs'
  ]));