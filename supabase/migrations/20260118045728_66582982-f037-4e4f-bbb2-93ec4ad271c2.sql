-- =============================================
-- SEED: Novas Categorias e Materiais para Base de Preços
-- =============================================

-- Primeiro, limpar as categorias e materiais existentes (mantendo estrutura)
DELETE FROM public.materials WHERE codigo NOT LIKE 'KEEP_%';
DELETE FROM public.material_categories WHERE nome NOT LIKE 'KEEP_%';

-- Inserir novas categorias
INSERT INTO public.material_categories (nome, descricao, icone, ordem, ativa) VALUES
('Trabalhos Preparatórios', 'Vistoria, implantação, limpeza e preparação de obra', 'HardHat', 1, true),
('Demolições', 'Demolição de estruturas e remoção de materiais', 'Hammer', 2, true),
('Movimento de Terras', 'Escavação, aterro e compactação de solos', 'Mountain', 3, true),
('Betão e Estruturas', 'Betão, armaduras, cofragem e estruturas', 'Building2', 4, true),
('Alvenarias e Divisórias', 'Tijolos, blocos, gesso cartonado e divisórias', 'Layers', 5, true),
('Revestimentos e Cerâmicos', 'Azulejos, porcelanatos e revestimentos', 'Grid3x3', 6, true),
('Pavimentos', 'Pisos flutuantes, vinílicos e pavimentos', 'Square', 7, true),
('Isolamentos e Impermeabilizações', 'Isolamentos térmicos, acústicos e impermeabilizações', 'Shield', 8, true),
('Coberturas', 'Telhas, chapas e sistemas de cobertura', 'Home', 9, true),
('Carpintarias e Madeira', 'Portas, armários e trabalhos em madeira', 'TreePine', 10, true),
('Caixilharias e Vidros', 'Janelas, portas e vidros', 'PanelTop', 11, true),
('Pinturas e Acabamentos', 'Tintas, vernizes e acabamentos', 'Paintbrush', 12, true),
('Instalações Elétricas', 'Cabos, quadros e materiais elétricos', 'Zap', 13, true),
('Canalizações e Sanitários', 'Tubagens, louças e equipamentos sanitários', 'Pipette', 14, true),
('AVAC e Ventilação', 'Ar condicionado, ventilação e climatização', 'Wind', 15, true),
('Fachadas e Serralharias', 'Gradeamentos, portões e trabalhos metálicos', 'Fence', 16, true),
('Fixações e Consumíveis', 'Parafusos, buchas, colas e consumíveis', 'Wrench', 17, true),
('Segurança e Sinalização', 'Equipamentos de segurança e sinalização', 'ShieldAlert', 18, true)
ON CONFLICT DO NOTHING;

-- Inserir materiais usando subqueries para obter IDs das categorias
-- Categoria 01: Trabalhos Preparatórios
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Trabalhos Preparatórios'), '01_VISTORIA_E_IMPLANTACAO_DE_OBRA', 'Vistoria e implantação de obra', 'serv', true),
((SELECT id FROM public.material_categories WHERE nome = 'Trabalhos Preparatórios'), '01_TAPUMES_METALICOS_PROVISORIOS', 'Tapumes metálicos provisórios', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Trabalhos Preparatórios'), '01_PLACA_DE_OBRA', 'Placa de obra', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Trabalhos Preparatórios'), '01_CONTENTOR_RESIDUOS_6_M3', 'Contentor resíduos 6 m3', 'dia', true),
((SELECT id FROM public.material_categories WHERE nome = 'Trabalhos Preparatórios'), '01_LIMPEZA_INICIAL_DO_TERRENO', 'Limpeza inicial do terreno', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Trabalhos Preparatórios'), '01_TOPOGRAFIA_LEVANTAMENTO', 'Topografia / levantamento', 'serv', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 02: Demolições
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Demolições'), '02_DEMOLICAO_DE_ALVENARIA_TIJOLO', 'Demolição de alvenaria (tijolo)', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Demolições'), '02_DEMOLICAO_DE_BETONILHA', 'Demolição de betonilha', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Demolições'), '02_DEMOLICAO_DE_REVESTIMENTO_CERAMICO', 'Demolição de revestimento cerâmico', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Demolições'), '02_REMOCAO_DE_CAIXILHARIA', 'Remoção de caixilharia', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Demolições'), '02_CARGA_E_TRANSPORTE_DE_ENTULHO', 'Carga e transporte de entulho', 'm3', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 03: Movimento de Terras
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Movimento de Terras'), '03_ESCAVACAO_EM_TERRENO_NORMAL', 'Escavação em terreno normal', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Movimento de Terras'), '03_ESCAVACAO_EM_ROCHA', 'Escavação em rocha', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Movimento de Terras'), '03_ATERRO_E_COMPACTACAO', 'Aterro e compactação', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Movimento de Terras'), '03_BRITA_PARA_REGULARIZACAO', 'Brita para regularização', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Movimento de Terras'), '03_GEOTEXTIL_SEPARADOR_150_G_M2', 'Geotêxtil separador 150 g/m2', 'm2', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 04: Betão e Estruturas
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_CIMENTO_CEM_II_B_L_32_5_SACO_25KG', 'Cimento CEM II/B-L 32,5 (saco 25kg)', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_AREIA_LAVADA_0_4', 'Areia lavada 0/4', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_BRITA_12_19', 'Brita 12/19', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ACO_A500_NR_VARAO_6MM', 'Aço A500 NR varão 6mm', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ACO_A500_NR_VARAO_8MM', 'Aço A500 NR varão 8mm', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ACO_A500_NR_VARAO_10MM', 'Aço A500 NR varão 10mm', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ACO_A500_NR_VARAO_12MM', 'Aço A500 NR varão 12mm', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ACO_A500_NR_VARAO_16MM', 'Aço A500 NR varão 16mm', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ACO_A500_NR_VARAO_20MM', 'Aço A500 NR varão 20mm', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_REDE_ELECTROSSOLDADA_150X150_O6', 'Rede electrossoldada 150x150 Ø6', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_BETAO_PRONTO_C16_20', 'Betão pronto C16/20', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_BETAO_PRONTO_C20_25', 'Betão pronto C20/25', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_BETAO_PRONTO_C25_30', 'Betão pronto C25/30', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_BETAO_PRONTO_C30_37', 'Betão pronto C30/37', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ADITIVO_PLASTIFICANTE_PARA_BETAO', 'Aditivo plastificante para betão', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_COFRAGEM_PAINEL', 'Cofragem (painel)', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_DESCOFRANTE', 'Descofrante', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_MALHA_ANTI_FISSURACAO_FIBRA', 'Malha anti-fissuração (fibra)', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ESPACADOR_PLASTICO_PARA_ARMADURA', 'Espaçador plástico para armadura', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ARAME_RECOZIDO', 'Arame recozido', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_PREGO_COFRAGEM', 'Prego cofragem', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_ESCORA_METALICA_REGULAVEL', 'Escora metálica regulável', 'dia', true),
((SELECT id FROM public.material_categories WHERE nome = 'Betão e Estruturas'), '04_VIGA_H20_MADEIRA_COFRAGEM', 'Viga H20 madeira cofragem', 'm', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 05: Alvenarias e Divisórias
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_TIJOLO_CERAMICO_11CM', 'Tijolo cerâmico 11cm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_TIJOLO_CERAMICO_15CM', 'Tijolo cerâmico 15cm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_BLOCO_BETAO_20CM', 'Bloco betão 20cm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_GESSO_CARTONADO_PLACA_13MM', 'Gesso cartonado placa 13mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_PERFIS_METALICOS_PARA_DRYWALL', 'Perfis metálicos para drywall', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_LA_MINERAL_PARA_DIVISORIAS_50MM', 'Lã mineral para divisórias 50mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_ARGAMASSA_DE_ASSENTAMENTO', 'Argamassa de assentamento', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_ARGAMASSA_COLA', 'Argamassa cola', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_ARGAMASSA_PROJETADA_REBOCO', 'Argamassa projetada reboco', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_REDE_FIBRA_DE_VIDRO_160_G_M2', 'Rede fibra de vidro 160 g/m2', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_CANTONEIRA_PVC', 'Cantoneira PVC', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_BLOCO_TERMICO_20CM', 'Bloco térmico 20cm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Alvenarias e Divisórias'), '05_LINTEIS_PRE_FABRICADOS', 'Linteis pré-fabricados', 'm', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 06: Revestimentos e Cerâmicos
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_AZULEJO_30X60', 'Azulejo 30x60', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_20X20', 'Porcelanato 20x20', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_30X30', 'Porcelanato 30x30', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_45X45', 'Porcelanato 45x45', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_60X60', 'Porcelanato 60x60', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_30X60', 'Porcelanato 30x60', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_60X120', 'Porcelanato 60x120', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_60X60_RETIFICADO', 'Porcelanato 60x60 retificado', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PORCELANATO_20X120_EFEITO_MADEIRA', 'Porcelanato 20x120 (efeito madeira)', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_ARGAMASSA_COLA_C2TE', 'Argamassa cola C2TE', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_REJUNTE_FLEXIVEL', 'Rejunte flexível', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_NIVELADOR_CLIP_SISTEMA_NIVELAMENTO', 'Nívelador/clip sistema nivelamento', 'kit', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_MEMBRANA_DESACOPLAMENTO', 'Membrana desacoplamento', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_MOSAICO_HIDRAULICO', 'Mosaico hidráulico', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PEDRA_NATURAL_MARMORE_2CM', 'Pedra natural (mármore) 2cm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_PEDRA_NATURAL_GRANITO_2CM', 'Pedra natural (granito) 2cm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_CIMENTO_COLA_FLEXIVEL_S1', 'Cimento cola flexível S1', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Revestimentos e Cerâmicos'), '06_MASSA_AUTONIVELANTE_PARA_BASE', 'Massa autonivelante para base', 'saco', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 07: Pavimentos
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_PISO_FLUTUANTE_AC4_7MM', 'Piso flutuante AC4 7mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_PISO_FLUTUANTE_AC4_8MM', 'Piso flutuante AC4 8mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_PISO_FLUTUANTE_AC4_10MM', 'Piso flutuante AC4 10mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_PISO_FLUTUANTE_AC4_12MM', 'Piso flutuante AC4 12mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_MANTA_ACUSTICA_PARA_FLUTUANTE', 'Manta acústica para flutuante', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_RODAPE_MDF_70MM', 'Rodapé MDF 70mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_RODAPE_PVC_70MM', 'Rodapé PVC 70mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_BETONILHA_AUTONIVELANTE', 'Betonilha autonivelante', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_BETONILHA_TRADICIONAL', 'Betonilha tradicional', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_VINILICO_SPC_CLICK_5MM', 'Vinílico SPC click 5mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_CIMENTO_COLA_PARA_RODAPE', 'Cimento cola para rodapé', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_TRANSICAO_PERFIL_ALUMINIO', 'Transição/perfil alumínio', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_SOALHO_MADEIRA_MACICA', 'Soalho madeira maciça', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_MANTA_DESACOPLAMENTO_ACUSTICO', 'Manta desacoplamento acústico', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pavimentos'), '07_COLA_PARQUET', 'Cola parquet', 'kg', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 08: Isolamentos e Impermeabilizações
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_XPS_20MM', 'XPS 20mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_XPS_30MM', 'XPS 30mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_XPS_40MM', 'XPS 40mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_XPS_50MM', 'XPS 50mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_XPS_60MM', 'XPS 60mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_EPS_60MM', 'EPS 60mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_LA_MINERAL_80MM', 'Lã mineral 80mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_MEMBRANA_IMPERMEABILIZANTE_LIQUIDA', 'Membrana impermeabilizante líquida', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_TELA_ASFALTICA_APP_4KG_M2', 'Tela asfáltica APP 4kg/m2', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_PRIMARIO_ASFALTICO', 'Primário asfáltico', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_FITA_BUTILICA', 'Fita butílica', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_SELANTE_PU', 'Selante PU', 'cart', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_ISOLAMENTO_ETICS_EPS_60MM', 'Isolamento ETICS EPS 60mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_REDE_ETICS', 'Rede ETICS', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_ARGAMASSA_BASECOAT_ETICS', 'Argamassa basecoat ETICS', 'saco', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_PERFIL_ARRANQUE_ETICS', 'Perfil arranque ETICS', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_MEMBRANA_GEODRENO', 'Membrana geodreno', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Isolamentos e Impermeabilizações'), '08_ARGAMASSA_IMPERMEAVEL', 'Argamassa impermeável', 'saco', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 09: Coberturas
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_TELHA_CERAMICA_LUSA', 'Telha cerâmica lusa', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_SUBTELHA_RESPIRAVEL', 'Subtelha respirável', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_RIPAS_DE_MADEIRA_TRATADA', 'Ripas de madeira tratada', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_CHAPA_SANDWICH_40MM', 'Chapa sandwich 40mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_CALHA_ZINCADA', 'Calha zincada', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_TUBO_QUEDA_PVC_O90', 'Tubo queda PVC Ø90', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_RUFOS_E_REMATES_CHAPA', 'Rufos e remates chapa', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_PAINEL_SANDWICH_60MM', 'Painel sandwich 60mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_TELHA_SANDWICH', 'Telha sandwich', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_LA_MINERAL_COBERTURA', 'Lã mineral cobertura', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Coberturas'), '09_CHAMINE_INOX_DUPLA_PAREDE', 'Chaminé inox dupla parede', 'm', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 10: Carpintarias e Madeira
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_PORTA_INTERIOR_LACADA', 'Porta interior lacada', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_ARO_E_GUARNICOES', 'Aro e guarnições', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_MDF_HIDROFUGO_18MM', 'MDF hidrófugo 18mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_MADEIRA_PINHO_TRATADO', 'Madeira pinho tratado', 'm3', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_VERNIZ_POLIURETANO', 'Verniz poliuretano', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_DOBRADICA_INOX', 'Dobradiça inox', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_FECHADURA_EMBUTIR', 'Fechadura embutir', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_ARMARIO_COZINHA_MDF', 'Armário cozinha MDF', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_BANCADA_COZINHA_GRANITO', 'Bancada cozinha granito', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_BANCADA_COZINHA_QUARTZO', 'Bancada cozinha quartzo', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Carpintarias e Madeira'), '10_PRATELEIRA_MDF_25MM', 'Prateleira MDF 25mm', 'm2', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 11: Caixilharias e Vidros
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_JANELA_PVC_OSCILOBATENTE_C_VIDRO_DUPLO', 'Janela PVC oscilobatente c/ vidro duplo', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_JANELA_ALUMINIO_C_CORTE_TERMICO', 'Janela alumínio c/ corte térmico', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_VIDRO_DUPLO_4_16_4', 'Vidro duplo 4/16/4', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_PORTA_DE_ENTRADA_BLINDADA', 'Porta de entrada blindada', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_SOLEIRA_GRANITO', 'Soleira granito', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_ESTORES_TERMICOS', 'Estores térmicos', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_SILICONE_NEUTRO', 'Silicone neutro', 'cart', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_PORTA_DE_GARAGEM_SECCIONADA', 'Porta de garagem seccionada', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_ESTORE_ELETRICO', 'Estore elétrico', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_MOTOR_ESTORE', 'Motor estore', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_PELICULA_CONTROLE_SOLAR', 'Película controle solar', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Caixilharias e Vidros'), '11_REDE_MOSQUITEIRA', 'Rede mosquiteira', 'm2', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 12: Pinturas e Acabamentos
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_MASSA_DE_REGULARIZACAO', 'Massa de regularização', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_PRIMARIO_ACRILICO', 'Primário acrílico', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_TINTA_PLASTICA_INTERIOR', 'Tinta plástica interior', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_TINTA_EXTERIOR_SILOXANICA', 'Tinta exterior siloxânica', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_ESMALTE_SINTETICO', 'Esmalte sintético', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_LIXA_GRAO_120', 'Lixa grão 120', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_FITA_DE_MASCARAR', 'Fita de mascarar', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_ROLO_PINTURA', 'Rolo pintura', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_TINTA_ESMALTE_AQUOSO', 'Tinta esmalte aquoso', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_VERNIZ_AQUOSO', 'Verniz aquoso', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_MASSA_TAPA_FISSURAS', 'Massa tapa-fissuras', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Pinturas e Acabamentos'), '12_SELANTE_ACRILICO_PINTAVEL', 'Selante acrílico pintável', 'cart', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 13: Instalações Elétricas
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CABO_ELETRICO_H07V_U_1_5MM2', 'Cabo elétrico H07V-U 1.5mm2', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CABO_ELETRICO_H07V_U_2_5MM2', 'Cabo elétrico H07V-U 2.5mm2', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CABO_ELETRICO_H07V_U_4MM2', 'Cabo elétrico H07V-U 4mm2', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CABO_ELETRICO_H07V_U_6MM2', 'Cabo elétrico H07V-U 6mm2', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_TUBO_VD_20MM', 'Tubo VD 20mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CAIXA_APARELHAGEM', 'Caixa aparelhagem', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_QUADRO_ELETRICO_24_MODULOS', 'Quadro elétrico 24 módulos', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_DISJUNTOR_16A', 'Disjuntor 16A', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_DIFERENCIAL_30MA', 'Diferencial 30mA', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_TOMADA_SCHUKO', 'Tomada schuko', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_INTERRUPTOR_SIMPLES', 'Interruptor simples', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_LUMINARIA_LED_DOWNLIGHT', 'Luminária LED downlight', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CABO_UTP_CAT6', 'Cabo UTP Cat6', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_TOMADA_RJ45', 'Tomada RJ45', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CABO_COAXIAL', 'Cabo coaxial', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_CAMPAINHA_VIDEO_PORTEIRO', 'Campainha vídeo-porteiro', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_ELETROCALHA_60X40', 'Eletrocalha 60x40', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_FITA_ISOLADORA', 'Fita isoladora', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Instalações Elétricas'), '13_LAMPADA_LED_E27', 'Lâmpada LED E27', 'un', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 14: Canalizações e Sanitários
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PEX_16MM', 'Tubo PEX 16mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_MULTICAMADA_16MM', 'Tubo multicamada 16mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PVC_ESGOTO_O20', 'Tubo PVC esgoto Ø20', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PVC_ESGOTO_O25', 'Tubo PVC esgoto Ø25', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PVC_ESGOTO_O32', 'Tubo PVC esgoto Ø32', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PVC_ESGOTO_O40', 'Tubo PVC esgoto Ø40', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PVC_ESGOTO_O50', 'Tubo PVC esgoto Ø50', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PVC_ESGOTO_O75', 'PVC esgoto Ø75', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TUBO_PVC_ESGOTO_O110', 'Tubo PVC esgoto Ø110', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_SIFAO', 'Sifão', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_VALVULA_CORTE', 'Válvula corte', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_SANITA_COMPACTA', 'Sanita compacta', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_LAVATORIO', 'Lavatório', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_BASE_DUCHE_RESINA', 'Base duche resina', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_TORNEIRA_MISTURADORA', 'Torneira misturadora', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_AUTOCLISMO_EMBUTIDO', 'Autoclismo embutido', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_BOMBA_PRESSURIZADORA', 'Bomba pressurizadora', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_AQUECEDOR_AGUAS_TERMOACUMULADOR_100L', 'Aquecedor águas (termoacumulador 100L)', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_MISTURADORA_COZINHA', 'Misturadora cozinha', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_LOICA_COZINHA_LAVA_LOICA', 'Loiça cozinha (lava-loiça)', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_RALO_LINEAR_DUCHE', 'Ralo linear duche', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_COLUNA_DUCHE', 'Coluna duche', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Canalizações e Sanitários'), '14_ACESSORIOS_WC', 'Acessórios WC (toalheiro, etc.)', 'kit', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 15: AVAC e Ventilação
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_UNIDADE_AC_SPLIT_9000_BTU', 'Unidade AC split 9000 BTU', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_UNIDADE_AC_SPLIT_12000_BTU', 'Unidade AC split 12000 BTU', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_TUBO_COBRE_ISOLADO_1_4_3_8', 'Tubo cobre isolado 1/4+3/8', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_DRENO_CONDENSADOS', 'Dreno condensados', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_GRELHA_VENTILACAO', 'Grelha ventilação', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_CONDUTA_FLEXIVEL_125MM', 'Conduta flexível 125mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_VMC_SIMPLES_FLUXO', 'VMC simples fluxo', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_EXAUSTOR_CASA_DE_BANHO', 'Exaustor casa de banho', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_BOMBA_DE_CALOR_AQS_200L', 'Bomba de calor AQS 200L', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_RADIADOR_TOALHEIRO', 'Radiador toalheiro', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_CONDUTA_RIGIDA_125MM', 'Conduta rígida 125mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'AVAC e Ventilação'), '15_GAS_REFRIGERANTE_CARGA', 'Gás refrigerante (carga)', 'serv', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 16: Fachadas e Serralharias
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_GRADEAMENTO_METALICO', 'Gradeamento metálico', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_CORRIMAO_INOX', 'Corrimão inox', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_PORTAO_METALICO', 'Portão metálico', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_CHAPA_ACO_2MM', 'Chapa aço 2mm', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_TUBO_ACO_40X40', 'Tubo aço 40x40', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_TINTA_ANTICORROSIVA', 'Tinta anticorrosiva', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_PARAFUSOS_INOX', 'Parafusos inox', 'cx', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_MALHA_SOL_REDE_SOMBREAMENTO', 'Malha sol (rede sombreamento)', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_PAINEL_VEDACAO_RIGIDO', 'Painel vedação rígido', 'm2', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fachadas e Serralharias'), '16_FECHADURA_PORTAO', 'Fechadura portão', 'un', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 17: Fixações e Consumíveis
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_PARAFUSO_GESSO_CARTONADO_25MM', 'Parafuso gesso cartonado 25mm', 'cx', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_BUCHA_NYLON_8MM', 'Bucha nylon 8mm', 'cx', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_PREGOS_ACO_50MM', 'Pregos aço 50mm', 'kg', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_ESPUMA_PU', 'Espuma PU', 'cart', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_COLA_DE_MONTAGEM', 'Cola de montagem', 'cart', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_DISCO_CORTE_125MM', 'Disco corte 125mm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_BROCA_BETAO_8MM', 'Broca betão 8mm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_LUVAS_NITRILO', 'Luvas nitrilo', 'par', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_SILICONE_SANITARIO', 'Silicone sanitário', 'cart', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_ADESIVO_EPOXI_2_COMPONENTES', 'Adesivo epóxi (2 componentes)', 'kit', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_SELANTE_HIBRIDO_MS', 'Selante híbrido MS', 'cart', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_ABRACADEIRA_INOX', 'Abraçadeira inox', 'cx', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_SERRA_COPO_68MM', 'Serra copo 68mm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_DISCO_LIXA_125MM', 'Disco lixa 125mm', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_CABO_ACO_3MM', 'Cabo de aço 3mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_CORRENTE_6MM', 'Corrente 6mm', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_FITA_TEFLON', 'Fita teflon', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_COLA_PVC', 'Cola PVC', 'l', true),
((SELECT id FROM public.material_categories WHERE nome = 'Fixações e Consumíveis'), '17_LIMPA_CONTACTOS', 'Limpa contactos', 'spray', true)
ON CONFLICT (codigo) DO NOTHING;

-- Categoria 18: Segurança e Sinalização
INSERT INTO public.materials (category_id, codigo, nome, unidade_base, ativo) VALUES
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_EXTINTOR_PO_QUIMICO_6KG', 'Extintor pó químico 6kg', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_SINALIZACAO_SEGURANCA', 'Sinalização segurança', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_CAPACETE_OBRA', 'Capacete obra', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_COLETE_REFLETOR', 'Colete refletor', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_FITA_SINALIZADORA', 'Fita sinalizadora', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_BARREIRA_PROTECAO', 'Barreira proteção', 'm', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_OCULOS_PROTECAO', 'Óculos de proteção', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_PROTETOR_AURICULAR', 'Protetor auricular', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_MASCARA_PFF2', 'Máscara PFF2', 'un', true),
((SELECT id FROM public.material_categories WHERE nome = 'Segurança e Sinalização'), '18_BOTA_SEGURANCA', 'Bota de segurança', 'par', true)
ON CONFLICT (codigo) DO NOTHING;