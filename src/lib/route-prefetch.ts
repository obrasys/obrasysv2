// Prefetch de chunks lazy por rota.
// Mapeia o primeiro segmento do href para os imports usados em App.tsx.
// O Vite reusa o módulo já carregado, então chamar import() várias vezes é seguro.

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader[]> = {
  "/dashboard": [() => import("@/pages/Dashboard")],
  "/orcamentos": [
    () => import("@/pages/orcamentos/Index"),
    () => import("@/pages/orcamentos/Criar"),
    () => import("@/pages/orcamentos/Essencial"),
  ],
  "/obras": [
    () => import("@/pages/obras/Index"),
    () => import("@/pages/obras/Ver"),
  ],
  "/clientes": [
    () => import("@/pages/clientes/Index"),
    () => import("@/pages/clientes/Ver"),
  ],
  "/rdos": [
    () => import("@/pages/rdos/Index"),
    () => import("@/pages/rdos/Criar"),
  ],
  "/tarefas": [() => import("@/pages/tarefas/Index")],
  "/conformidade": [() => import("@/pages/conformidade/Index")],
  "/base-precos": [() => import("@/pages/base-precos/Index")],
  "/suporte": [() => import("@/pages/suporte/Index")],
  "/financeiro": [
    () => import("@/pages/financeiro/Index"),
    () => import("@/pages/financeiro/Fornecedores"),
  ],
  "/perfil": [() => import("@/pages/Perfil")],
  "/definicoes": [() => import("@/pages/Definicoes")],
  "/subscricao": [() => import("@/pages/Subscricao")],
  "/relatorios": [() => import("@/pages/relatorios/Index")],
  "/axia": [() => import("@/pages/axia/Index"), () => import("@/pages/axia/Inbox")],
  "/importar": [() => import("@/pages/importar/Index")],
  "/icf": [() => import("@/pages/icf/Index")],
  "/instalacoes": [() => import("@/pages/instalacoes/Index")],
  "/rede-fornecedores": [() => import("@/pages/rede-fornecedores/Index")],
  "/recursos": [() => import("@/pages/recursos/Index")],
  "/livro-ponto": [() => import("@/pages/livro-ponto/Index")],
  "/autos-medicao": [() => import("@/pages/autos-medicao/Index")],
  "/admin": [() => import("@/pages/admin/Index")],
  "/admin/utilizadores": [() => import("@/pages/admin/Utilizadores")],
  "/admin/financeiro": [() => import("@/pages/admin/FinanceiroGlobal")],
  "/admin/auditoria": [() => import("@/pages/admin/Auditoria")],
  "/admin/templates": [() => import("@/pages/admin/Templates")],
  "/admin/analytics": [() => import("@/pages/admin/Analytics")],
  "/admin/fornecedores": [() => import("@/pages/admin/Fornecedores")],
  "/admin/tickets": [() => import("@/pages/admin/Tickets")],
  "/admin/migracao": [() => import("@/pages/admin/Migracao")],
  "/portal": [() => import("@/pages/portal/Index")],
};

const prefetched = new Set<string>();

export function prefetchRoute(href: string) {
  if (prefetched.has(href)) return;
  prefetched.add(href);
  const list = loaders[href];
  if (!list) return;
  // Disparar em background, sem bloquear nem propagar erros.
  list.forEach((load) => {
    load().catch(() => {
      prefetched.delete(href);
    });
  });
}
