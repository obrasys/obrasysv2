CREATE OR REPLACE FUNCTION public.handle_new_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
BEGIN
  meta := NEW.raw_user_meta_data;
  IF meta->>'role' = 'supplier' THEN
    INSERT INTO public.supplier_profiles (
      user_id,
      legal_name,
      trade_name,
      nif,
      responsavel_nome,
      telemovel,
      email_comercial,
      morada_completa,
      codigo_postal,
      localidade,
      location_district,
      location_municipality,
      pais,
      cae_principal,
      cae_secundario,
      telefone_fixo,
      website,
      ano_fundacao,
      num_colaboradores,
      categoria_principal,
      zona_atuacao,
      raio_atuacao_km,
      prazo_medio_entrega,
      min_order_value,
      trabalha_credito,
      prazo_pagamento_padrao,
      desconto_volume,
      aceita_pedidos_plataforma,
      permite_api,
      atualizacao_precos,
      frequencia_atualizacao,
      status,
      aceita_termos,
      aceita_comunicacoes,
      certificacoes,
      subcategorias,
      distritos_atuacao,
      tipo_fornecimento
    )
    VALUES (
      NEW.id,
      COALESCE(meta->>'legal_name', meta->>'company_name', 'Nova Empresa'),
      COALESCE(meta->>'trade_name', meta->>'legal_name', meta->>'company_name', 'Nova Empresa'),
      meta->>'nif',
      meta->>'responsavel_nome',
      meta->>'telemovel',
      COALESCE(meta->>'email_comercial', NEW.email),
      meta->>'morada_completa',
      meta->>'codigo_postal',
      meta->>'localidade',
      meta->>'location_district',
      meta->>'location_municipality',
      COALESCE(meta->>'pais', 'Portugal'),
      meta->>'cae_principal',
      meta->>'cae_secundario',
      meta->>'telefone_fixo',
      meta->>'website',
      (meta->>'ano_fundacao')::int,
      meta->>'num_colaboradores',
      meta->>'categoria_principal',
      COALESCE(meta->>'zona_atuacao', 'nacional'),
      (meta->>'raio_atuacao_km')::int,
      meta->>'prazo_medio_entrega',
      COALESCE((meta->>'min_order_value')::numeric, 0),
      COALESCE((meta->>'trabalha_credito')::boolean, false),
      meta->>'prazo_pagamento_padrao',
      COALESCE((meta->>'desconto_volume')::boolean, false),
      COALESCE((meta->>'aceita_pedidos_plataforma')::boolean, true),
      COALESCE((meta->>'permite_api')::boolean, false),
      COALESCE(meta->>'atualizacao_precos', 'manual'),
      meta->>'frequencia_atualizacao',
      'pending',
      COALESCE((meta->>'aceita_termos')::boolean, false),
      COALESCE((meta->>'aceita_comunicacoes')::boolean, false),
      COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(meta->'certificacoes'))), '{}'::text[]),
      COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(meta->'subcategorias'))), '{}'::text[]),
      COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(meta->'distritos_atuacao'))), '{}'::text[]),
      COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(meta->'tipo_fornecimento'))), '{}'::text[])
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_supplier ON auth.users;
CREATE TRIGGER on_auth_user_created_supplier
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_supplier();