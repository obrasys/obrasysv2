-- Fase 1 do plano de correcao (.lovable/plan.md):
-- ataca as queries top-1..top-4 do pg_stat_statements.
-- Nota: a tabela public.obras nao tem organization_id; o isolamento
-- multi-tenant nesta tabela e feito por user_id + RLS, por isso o
-- segundo indice troca organization_id por user_id.

CREATE INDEX IF NOT EXISTS ix_obras_arquivada_status_created
  ON public.obras (arquivada, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_obras_user_arquivada
  ON public.obras (user_id, arquivada);

CREATE INDEX IF NOT EXISTS ix_orcamentos_obra_id
  ON public.orcamentos (obra_id);

CREATE INDEX IF NOT EXISTS ix_artigos_orc_capitulo
  ON public.artigos_orcamento (capitulo_id);

ANALYZE public.obras;
ANALYZE public.orcamentos;
ANALYZE public.artigos_orcamento;