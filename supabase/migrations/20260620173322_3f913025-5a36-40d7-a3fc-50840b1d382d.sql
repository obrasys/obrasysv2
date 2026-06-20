
DO $$
DECLARE
  v_org uuid := '305a7ef8-f8a3-46a2-9ec5-4699ee9297f2';
  v_user uuid := '7f00df31-6df2-47f5-8c13-ee9f21a17db4';
  v_forn uuid;
  v_pb uuid;
BEGIN
  INSERT INTO public.fornecedores (nome, email, telefone, nif, ativo, organization_id, created_by, user_id, area_atuacao, categoria, pessoa_contacto, condicoes_comerciais, prazo_medio_entrega_dias, prazo_medio_pagamento_dias)
  VALUES ('Materiais Demo Construção', 'demo@materiaisdemo.pt', '+351 910 000 000', '500000001', true, v_org, v_user, v_user, 'Materiais de construção', 'Materiais', 'João Demo', '30 dias', 3, 30)
  RETURNING id INTO v_forn;

  INSERT INTO public.tenant_supplier_pricebooks (organization_id, fornecedor_id, uploaded_by, name, file_name, file_type, status, categoria, valid_from, item_count, notes)
  VALUES (v_org, v_forn, v_user, 'Tabela Demo 2026', 'demo-2026.csv', 'text/csv', 'active', 'Materiais', CURRENT_DATE, 8, 'Tabela criada para teste da integração Orçamento ↔ Fornecedores')
  RETURNING id INTO v_pb;

  INSERT INTO public.tenant_supplier_pricebook_items (pricebook_id, organization_id, fornecedor_id, codigo_artigo, descricao, unidade, preco_unitario, iva, categoria, marca, lead_time_days, origem_importacao)
  VALUES
    (v_pb, v_org, v_forn, 'CIM-32.5', 'Cimento Portland 32.5R - saco 25kg', 'saco', 4.20, 23, 'Cimentos', 'Secil', 3, 'manual'),
    (v_pb, v_org, v_forn, 'BRT-1525', 'Brita 15/25 - tonelada', 't', 18.50, 23, 'Agregados', 'Demo', 5, 'manual'),
    (v_pb, v_org, v_forn, 'FER-A500-10', 'Ferro nervurado A500NR Ø10mm', 'kg', 1.05, 23, 'Aço', 'Megasa', 7, 'manual'),
    (v_pb, v_org, v_forn, 'FER-A500-12', 'Ferro nervurado A500NR Ø12mm', 'kg', 1.02, 23, 'Aço', 'Megasa', 7, 'manual'),
    (v_pb, v_org, v_forn, 'TIJ-30x20x11', 'Tijolo cerâmico 30x20x11', 'un', 0.42, 23, 'Alvenaria', 'Preceram', 4, 'manual'),
    (v_pb, v_org, v_forn, 'ARE-RIO', 'Areia de rio lavada - tonelada', 't', 14.80, 23, 'Agregados', 'Demo', 5, 'manual'),
    (v_pb, v_org, v_forn, 'BLC-50x20x20', 'Bloco de betão 50x20x20', 'un', 1.15, 23, 'Alvenaria', 'Maprel', 4, 'manual'),
    (v_pb, v_org, v_forn, 'ARG-M10', 'Argamassa pronta M10 - saco 25kg', 'saco', 3.80, 23, 'Argamassas', 'Weber', 3, 'manual');
END $$;
