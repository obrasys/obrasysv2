import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { ThemeProvider } from "next-themes";
import { SuperAdminRoute } from "./components/admin/SuperAdminRoute";
import { ClientRoute } from "./components/portal/ClientRoute";
import { ManagerRoute } from "./components/portal/ManagerRoute";
import { SupplierRoute } from "./components/fornecedor/SupplierRoute";
import ScrollToTop from "./components/ScrollToTop";
import CookieConsent from "./components/CookieConsent";


// Landing + Auth (keep eager for initial load)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const CriarConta = lazy(() => import("./pages/CriarConta"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Verify2FA = lazy(() => import("./pages/Verify2FA"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const OrcamentosPage = lazy(() => import("./pages/orcamentos/Index"));
const CriarOrcamentoPage = lazy(() => import("./pages/orcamentos/Criar"));
const EditarOrcamentoPage = lazy(() => import("./pages/orcamentos/Editar"));
const VerOrcamentoPage = lazy(() => import("./pages/orcamentos/Ver"));
const EssencialPage = lazy(() => import("./pages/orcamentos/Essencial"));
const OrcamentacaoInteligentePage = lazy(() => import("./pages/orcamentos/Inteligente"));
const ObrasPage = lazy(() => import("./pages/obras/Index"));
const CriarObraPage = lazy(() => import("./pages/obras/Criar"));
const EditarObraPage = lazy(() => import("./pages/obras/Editar"));
const VerObraPage = lazy(() => import("./pages/obras/Ver"));
const ObraFinanceiroPage = lazy(() => import("./pages/obras/Financeiro"));
const OrcamentoRaiObraPage = lazy(() => import("./pages/obras/OrcamentoRaiObra"));
const MCEIndexPage = lazy(() => import("./pages/obras/mce/Index"));
const MCEFolhaPage = lazy(() => import("./pages/obras/mce/Folha"));
const ClientesPage = lazy(() => import("./pages/clientes/Index"));
const CriarClientePage = lazy(() => import("./pages/clientes/Criar"));
const EditarClientePage = lazy(() => import("./pages/clientes/Editar"));
const VerClientePage = lazy(() => import("./pages/clientes/Ver"));
const RDOsPage = lazy(() => import("./pages/rdos/Index"));
const CriarRDOPage = lazy(() => import("./pages/rdos/Criar"));
const EditarRDOPage = lazy(() => import("./pages/rdos/Editar"));
const VerRDOPage = lazy(() => import("./pages/rdos/Ver"));
const TarefasPage = lazy(() => import("./pages/tarefas/Index"));
const ConformidadePage = lazy(() => import("./pages/conformidade/Index"));
const BasePrecosPage = lazy(() => import("./pages/base-precos/Index"));
const BasePrecosInserirPage = lazy(() => import("./pages/base-precos/Inserir"));
const BasePrecosAuditoriaPage = lazy(() => import("./pages/base-precos/Auditoria"));
const SuportePage = lazy(() => import("./pages/suporte/Index"));
const FinanceiroPage = lazy(() => import("./pages/financeiro/Index"));
const FornecedoresPage = lazy(() => import("./pages/financeiro/Fornecedores"));
const CotacoesFornecedoresPage = lazy(() => import("./pages/financeiro/CotacoesFornecedores"));
const PerfilPage = lazy(() => import("./pages/Perfil"));
const DefinicoesPage = lazy(() => import("./pages/Definicoes"));
const DefinicoesFolhaFechoQualidadesPage = lazy(() => import("./pages/DefinicoesFolhaFechoQualidades"));
const DefinicoesShell = lazy(() => import("./components/definicoes/DefinicoesShell").then(m => ({ default: m.DefinicoesShell })));
const DefinicoesIndexPage = lazy(() => import("./pages/definicoes/Index"));
const DefinicoesPerfilPage = lazy(() => import("./pages/definicoes/Perfil"));
const DefinicoesContaPage = lazy(() => import("./pages/definicoes/Conta"));
const DefinicoesNotificacoesPage = lazy(() => import("./pages/definicoes/Notificacoes"));
const DefinicoesAparenciaPage = lazy(() => import("./pages/definicoes/Aparencia"));
const DefinicoesOrganizacaoPage = lazy(() => import("./pages/definicoes/Organizacao"));
const DefinicoesEquipaPage = lazy(() => import("./pages/definicoes/Equipa"));
const DefinicoesPapeisPage = lazy(() => import("./pages/definicoes/Papeis"));
const DefinicoesFaturacaoPage = lazy(() => import("./pages/definicoes/Faturacao"));
const DefinicoesIntegracoesPage = lazy(() => import("./pages/definicoes/Integracoes"));
const DefinicoesAuditoriaPage = lazy(() => import("./pages/definicoes/Auditoria"));
const DefinicoesLegalPage = lazy(() => import("./pages/definicoes/Legal"));
const LegalDocumentPage = lazy(() => import("./pages/legal/LegalDocument"));

const PlanosPage = lazy(() => import("./pages/Planos"));
const SubscricaoPage = lazy(() => import("./pages/Subscricao"));
const PesquisaPage = lazy(() => import("./pages/Pesquisa"));
const RegressarPage = lazy(() => import("./pages/Regressar"));
const RecursosPage = lazy(() => import("./pages/recursos/Index"));
const RelatoriosPage = lazy(() => import("./pages/relatorios/Index"));
const VerMembroPage = lazy(() => import("./pages/recursos/VerMembro"));
const AutosMedicaoPage = lazy(() => import("./pages/autos-medicao/Index"));
const CriarAutoMedicaoPage = lazy(() => import("./pages/autos-medicao/Criar"));
const EditarAutoMedicaoPage = lazy(() => import("./pages/autos-medicao/Editar"));
const VerAutoMedicaoPage = lazy(() => import("./pages/autos-medicao/Ver"));
const LivroPontoPage = lazy(() => import("./pages/livro-ponto/Index"));
const LivroPontoTrabalhadores = lazy(() => import("./pages/livro-ponto/Trabalhadores"));
const LivroPontoLancar = lazy(() => import("./pages/livro-ponto/Lancar"));
const InstalacoesIndex = lazy(() => import("./pages/instalacoes/Index"));
const EletricaPage = lazy(() => import("./pages/instalacoes/Eletrica"));
const CanalizacaoPage = lazy(() => import("./pages/instalacoes/Canalizacao"));
const TelecomPage = lazy(() => import("./pages/instalacoes/Telecom"));
const ConfigurarInstalacoesPage = lazy(() => import("./pages/instalacoes/Configurar"));
const RedeFornecedoresPage = lazy(() => import("./pages/rede-fornecedores/Index"));
const AxiaPage = lazy(() => import("./pages/axia/Index"));
const AxiaInboxPage = lazy(() => import("./pages/axia/Inbox"));
const ImportarPage = lazy(() => import("./pages/importar/Index"));
const CadernosPage = lazy(() => import("./pages/cadernos/Index"));
const ImportarCadernoPage = lazy(() => import("./pages/cadernos/Importar"));
const ValidarCadernoPage = lazy(() => import("./pages/cadernos/Validar"));
const ResumoCadernoPage = lazy(() => import("./pages/cadernos/Resumo"));
const PlantasPage = lazy(() => import("./pages/plantas/Index"));
const PlantaDetailPage = lazy(() => import("./pages/plantas/Detail"));
const PlantaQuantitativosPage = lazy(() => import("./pages/plantas/Quantitativos"));
const PlantaLeituraPage = lazy(() => import("./pages/planta-leitura/Index"));
const EspecialidadesPage = lazy(() => import("./pages/especialidades/Index"));
const EspecialidadeDetailPage = lazy(() => import("./pages/especialidades/Detail"));
const AdminDashboard = lazy(() => import("./pages/admin/Index"));
const AdminUtilizadores = lazy(() => import("./pages/admin/Utilizadores"));
const AdminFinanceiroGlobal = lazy(() => import("./pages/admin/FinanceiroGlobal"));
const AdminAuditoria = lazy(() => import("./pages/admin/Auditoria"));
const AdminTemplates = lazy(() => import("./pages/admin/Templates"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const MigracaoPage = lazy(() => import("./pages/admin/Migracao"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminFornecedores = lazy(() => import("./pages/admin/Fornecedores"));
const AdminAxiaNvidiaTest = lazy(() => import("./pages/admin/AxiaNvidiaTest"));
const AdminAxiaGatewayTest = lazy(() => import("./pages/admin/AxiaGatewayTest"));
const PortalIndex = lazy(() => import("./pages/portal/Index"));
const PortalObra = lazy(() => import("./pages/portal/Obra"));
const FornecedorAuth = lazy(() => import("./pages/fornecedor/Auth"));
const FornecedorAceitarConvite = lazy(() => import("./pages/fornecedor/AceitarConvite"));
const FornecedorPendingApproval = lazy(() => import("./pages/fornecedor/PendingApproval"));
const FornecedorDashboard = lazy(() => import("./pages/fornecedor/Dashboard"));
const FornecedorPedidos = lazy(() => import("./pages/fornecedor/Pedidos"));
const FornecedorPedidoDetalhe = lazy(() => import("./pages/fornecedor/PedidoDetalhe"));
const FornecedorPrecos = lazy(() => import("./pages/fornecedor/Precos"));
const FornecedorPerfil = lazy(() => import("./pages/fornecedor/Perfil"));
const IcfIndex = lazy(() => import("./pages/icf/Index"));
const IcfConfiguracao = lazy(() => import("./pages/icf/Configuracao"));
const IcfPanos = lazy(() => import("./pages/icf/Panos"));
const IcfFundacoes = lazy(() => import("./pages/icf/Fundacoes"));
const IcfLajes = lazy(() => import("./pages/icf/Lajes"));
const IcfResumo = lazy(() => import("./pages/icf/Resumo"));
const IcfBibliotecaTecnica = lazy(() => import("./pages/icf/BibliotecaTecnica"));
const IcfMapaVisualPanos = lazy(() => import("./pages/icf/MapaVisualPanos"));
const IcfManual = lazy(() => import("./pages/icf/Manual"));
const IcfAssistenteArquitetura = lazy(() => import("./pages/icf/AssistenteArquitetura"));
const IcfNovoDossier = lazy(() => import("./pages/icf/NovoDossier"));
const IcfDossier = lazy(() => import("./pages/icf/Dossier"));
const CentrosDeCustoPage = lazy(() => import("./pages/empresa/CentrosDeCusto"));
const GestaoEmpresaPage = lazy(() => import("./pages/empresa/GestaoEmpresa"));
const FaturacaoEmpresaPage = lazy(() => import("./pages/empresa/Faturacao"));

// Delays showing the fallback so quick chunk loads (<200ms) don't cause a layout flash.
// During in-app navigation, React keeps the previous screen visible until the new chunk is ready.
const DelayedPageLoader = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);
  return show ? <PageLoader /> : null;
};

const PageLoader = () => (
  <div className="min-h-screen bg-background flex">
    {/* Skeleton sidebar - mirrors real Sidebar dimensions */}
    <aside className="w-60 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col h-screen">
      <div className="px-5 pt-5 pb-4">
        <div className="h-8 w-24 bg-sidebar-accent/30 rounded animate-pulse" />
        <div className="h-3 w-16 bg-sidebar-accent/20 rounded mt-2 animate-pulse" />
      </div>
      <div className="flex-1 px-3 space-y-4 mt-2">
        {[5, 4, 3, 2].map((count, gi) => (
          <div key={gi} className="space-y-1">
            <div className="h-2.5 w-14 bg-sidebar-accent/15 rounded ml-2 mb-1 animate-pulse" />
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="h-8 bg-sidebar-accent/20 rounded-md animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </aside>
    {/* Content area skeleton */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* Skeleton topbar */}
      <div className="h-14 border-b border-border bg-card flex items-center px-6 gap-4">
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
      </div>
      {/* Skeleton page content */}
      <div className="flex-1 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <PreferencesProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<DelayedPageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/criar-conta" element={<CriarConta />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-2fa" element={<Verify2FA />} />
                  <Route path="/dashboard" element={<ManagerRoute><Dashboard /></ManagerRoute>} />
                  <Route path="/orcamentos" element={<ManagerRoute><OrcamentosPage /></ManagerRoute>} />
                  <Route path="/orcamentos/criar" element={<ManagerRoute><CriarOrcamentoPage /></ManagerRoute>} />
                  <Route path="/orcamentos/:id" element={<ManagerRoute><VerOrcamentoPage /></ManagerRoute>} />
                  <Route path="/orcamentos/:id/editar" element={<ManagerRoute><EditarOrcamentoPage /></ManagerRoute>} />
                  <Route path="/orcamentos/essencial/novo" element={<ManagerRoute><EssencialPage /></ManagerRoute>} />
                  <Route path="/orcamentos/inteligente" element={<ManagerRoute><OrcamentacaoInteligentePage /></ManagerRoute>} />
                  <Route path="/obras" element={<ManagerRoute><ObrasPage /></ManagerRoute>} />
                  <Route path="/obras/criar" element={<ManagerRoute><CriarObraPage /></ManagerRoute>} />
                  <Route path="/obras/:id" element={<ManagerRoute><VerObraPage /></ManagerRoute>} />
                  <Route path="/obras/:id/editar" element={<ManagerRoute><EditarObraPage /></ManagerRoute>} />
                  <Route path="/obras/:id/financeiro" element={<ManagerRoute><ObraFinanceiroPage /></ManagerRoute>} />
                  <Route path="/obras/:id/orcamento-rai" element={<ManagerRoute><OrcamentoRaiObraPage /></ManagerRoute>} />
                  <Route path="/obras/:id/mce" element={<ManagerRoute><MCEIndexPage /></ManagerRoute>} />
                  <Route path="/obras/:id/mce/:mceId" element={<ManagerRoute><MCEFolhaPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos" element={<ManagerRoute><CadernosPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/importar" element={<ManagerRoute><ImportarCadernoPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/:cadernoId/importar" element={<ManagerRoute><ImportarCadernoPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/:cadernoId/validar" element={<ManagerRoute><ValidarCadernoPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/:cadernoId/resumo" element={<ManagerRoute><ResumoCadernoPage /></ManagerRoute>} />
                  <Route path="/obras/:id/plantas" element={<ManagerRoute><PlantasPage /></ManagerRoute>} />
                  <Route path="/obras/:id/plantas/:planId" element={<ManagerRoute><PlantaDetailPage /></ManagerRoute>} />
                  <Route path="/obras/:id/plantas/:planId/quantitativos" element={<ManagerRoute><PlantaQuantitativosPage /></ManagerRoute>} />
                  <Route path="/planta-leitura" element={<ManagerRoute><PlantaLeituraPage /></ManagerRoute>} />
                  <Route path="/orcamentos/:budgetId/plantas" element={<ManagerRoute><PlantasPage /></ManagerRoute>} />
                  <Route path="/orcamentos/:budgetId/plantas/:planId" element={<ManagerRoute><PlantaDetailPage /></ManagerRoute>} />
                  <Route path="/orcamentos/:budgetId/plantas/:planId/quantitativos" element={<ManagerRoute><PlantaQuantitativosPage /></ManagerRoute>} />
                  <Route path="/obras/:id/especialidades" element={<ManagerRoute><EspecialidadesPage /></ManagerRoute>} />
                  <Route path="/obras/:id/especialidades/:planId" element={<ManagerRoute><EspecialidadeDetailPage /></ManagerRoute>} />
                  <Route path="/clientes" element={<ManagerRoute><ClientesPage /></ManagerRoute>} />
                  <Route path="/clientes/criar" element={<ManagerRoute><CriarClientePage /></ManagerRoute>} />
                  <Route path="/clientes/:id" element={<ManagerRoute><VerClientePage /></ManagerRoute>} />
                  <Route path="/clientes/:id/editar" element={<ManagerRoute><EditarClientePage /></ManagerRoute>} />
                  <Route path="/rdos" element={<ManagerRoute><RDOsPage /></ManagerRoute>} />
                  <Route path="/rdos/criar" element={<ManagerRoute><CriarRDOPage /></ManagerRoute>} />
                  <Route path="/rdos/:id" element={<ManagerRoute><VerRDOPage /></ManagerRoute>} />
                  <Route path="/rdos/:id/editar" element={<ManagerRoute><EditarRDOPage /></ManagerRoute>} />
                  <Route path="/tarefas" element={<ManagerRoute><TarefasPage /></ManagerRoute>} />
                  <Route path="/conformidade" element={<ManagerRoute><ConformidadePage /></ManagerRoute>} />
                  <Route path="/base-precos" element={<ManagerRoute><BasePrecosPage /></ManagerRoute>} />
                  <Route path="/base-precos/inserir" element={<ManagerRoute><BasePrecosInserirPage /></ManagerRoute>} />
                  <Route path="/base-precos/auditoria" element={<ManagerRoute><BasePrecosAuditoriaPage /></ManagerRoute>} />
                  <Route path="/suporte" element={<ManagerRoute><SuportePage /></ManagerRoute>} />
                  <Route path="/financeiro" element={<ManagerRoute><FinanceiroPage /></ManagerRoute>} />
                  <Route path="/financeiro/fornecedores" element={<ManagerRoute><FornecedoresPage /></ManagerRoute>} />
                  <Route path="/financeiro/cotacoes" element={<ManagerRoute><CotacoesFornecedoresPage /></ManagerRoute>} />
                  <Route path="/empresa/centros-de-custo" element={<ManagerRoute><CentrosDeCustoPage /></ManagerRoute>} />
                  <Route path="/empresa/gestao" element={<ManagerRoute><GestaoEmpresaPage /></ManagerRoute>} />
                  <Route path="/empresa/definicoes/faturacao" element={<ManagerRoute><FaturacaoEmpresaPage /></ManagerRoute>} />
                  <Route path="/perfil" element={<ManagerRoute><PerfilPage /></ManagerRoute>} />
                  <Route path="/definicoes" element={<ManagerRoute><DefinicoesShell /></ManagerRoute>}>
                    <Route index element={<DefinicoesIndexPage />} />
                    <Route path="perfil" element={<DefinicoesPerfilPage />} />
                    <Route path="conta" element={<DefinicoesContaPage />} />
                    <Route path="notificacoes" element={<DefinicoesNotificacoesPage />} />
                    <Route path="aparencia" element={<DefinicoesAparenciaPage />} />
                    <Route path="organizacao" element={<DefinicoesOrganizacaoPage />} />
                    <Route path="equipa" element={<DefinicoesEquipaPage />} />
                    <Route path="papeis" element={<DefinicoesPapeisPage />} />
                    <Route path="faturacao" element={<DefinicoesFaturacaoPage />} />
                    <Route path="integracoes" element={<DefinicoesIntegracoesPage />} />
                    <Route path="auditoria" element={<DefinicoesAuditoriaPage />} />
                    <Route path="legal" element={<DefinicoesLegalPage />} />
                  </Route>
                  <Route path="/definicoes/preferencias" element={<ManagerRoute><DefinicoesPage /></ManagerRoute>} />
                  <Route path="/definicoes/folha-fecho-qualidades" element={<ManagerRoute><DefinicoesFolhaFechoQualidadesPage /></ManagerRoute>} />

                  <Route path="/planos" element={<ManagerRoute><PlanosPage /></ManagerRoute>} />
                  <Route path="/subscricao" element={<ManagerRoute><SubscricaoPage /></ManagerRoute>} />
                  <Route path="/recursos" element={<ManagerRoute><RecursosPage /></ManagerRoute>} />
                  <Route path="/recursos/:id" element={<ManagerRoute><VerMembroPage /></ManagerRoute>} />
                  <Route path="/pesquisa" element={<ManagerRoute><PesquisaPage /></ManagerRoute>} />
                  <Route path="/regressar" element={<RegressarPage />} />
                  <Route path="/relatorios" element={<ManagerRoute><RelatoriosPage /></ManagerRoute>} />
                  <Route path="/autos-medicao" element={<ManagerRoute><AutosMedicaoPage /></ManagerRoute>} />
                  <Route path="/autos-medicao/criar" element={<ManagerRoute><CriarAutoMedicaoPage /></ManagerRoute>} />
                  <Route path="/autos-medicao/:id" element={<ManagerRoute><VerAutoMedicaoPage /></ManagerRoute>} />
                  <Route path="/autos-medicao/:id/editar" element={<ManagerRoute><EditarAutoMedicaoPage /></ManagerRoute>} />
                  <Route path="/livro-ponto" element={<ManagerRoute><LivroPontoPage /></ManagerRoute>} />
                  <Route path="/livro-ponto/trabalhadores" element={<ManagerRoute><LivroPontoTrabalhadores /></ManagerRoute>} />
                  <Route path="/livro-ponto/lancar" element={<ManagerRoute><LivroPontoLancar /></ManagerRoute>} />
                  <Route path="/instalacoes" element={<ManagerRoute><InstalacoesIndex /></ManagerRoute>} />
                  <Route path="/instalacoes/eletrica" element={<ManagerRoute><EletricaPage /></ManagerRoute>} />
                  <Route path="/instalacoes/canalizacao" element={<ManagerRoute><CanalizacaoPage /></ManagerRoute>} />
                  <Route path="/instalacoes/telecom" element={<ManagerRoute><TelecomPage /></ManagerRoute>} />
                  <Route path="/instalacoes/configurar" element={<ManagerRoute><ConfigurarInstalacoesPage /></ManagerRoute>} />
                  <Route path="/rede-fornecedores" element={<ManagerRoute><RedeFornecedoresPage /></ManagerRoute>} />
                  <Route path="/axia" element={<ManagerRoute><AxiaPage /></ManagerRoute>} />
                  <Route path="/axia/inbox" element={<ManagerRoute><AxiaInboxPage /></ManagerRoute>} />
                  <Route path="/importar" element={<ManagerRoute><ImportarPage /></ManagerRoute>} />
                  <Route path="/icf" element={<ManagerRoute><IcfIndex /></ManagerRoute>} />
                  <Route path="/icf/configuracao/:id" element={<ManagerRoute><IcfConfiguracao /></ManagerRoute>} />
                  <Route path="/icf/panos/:configId" element={<ManagerRoute><IcfPanos /></ManagerRoute>} />
                  <Route path="/icf/fundacoes/:configId" element={<ManagerRoute><IcfFundacoes /></ManagerRoute>} />
                  <Route path="/icf/lajes/:configId" element={<ManagerRoute><IcfLajes /></ManagerRoute>} />
                  <Route path="/icf/resumo/:configId" element={<ManagerRoute><IcfResumo /></ManagerRoute>} />
                  <Route path="/icf/biblioteca" element={<ManagerRoute><IcfBibliotecaTecnica /></ManagerRoute>} />
                  <Route path="/icf/mapa-visual" element={<ManagerRoute><IcfMapaVisualPanos /></ManagerRoute>} />
                  <Route path="/icf/manual" element={<ManagerRoute><IcfManual /></ManagerRoute>} />
                  <Route path="/icf/assistente" element={<ManagerRoute><IcfAssistenteArquitetura /></ManagerRoute>} />
                  <Route path="/icf/dossier/novo" element={<ManagerRoute><IcfNovoDossier /></ManagerRoute>} />
                  <Route path="/icf/dossier/:id" element={<ManagerRoute><IcfDossier /></ManagerRoute>} />

                  <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
                  <Route path="/admin/utilizadores" element={<SuperAdminRoute><AdminUtilizadores /></SuperAdminRoute>} />
                  <Route path="/admin/financeiro" element={<SuperAdminRoute><AdminFinanceiroGlobal /></SuperAdminRoute>} />
                  <Route path="/admin/auditoria" element={<SuperAdminRoute><AdminAuditoria /></SuperAdminRoute>} />
                  <Route path="/admin/templates" element={<SuperAdminRoute><AdminTemplates /></SuperAdminRoute>} />
                  <Route path="/admin/analytics" element={<SuperAdminRoute><AdminAnalytics /></SuperAdminRoute>} />
                  <Route path="/admin/migracao" element={<SuperAdminRoute><MigracaoPage /></SuperAdminRoute>} />
                  <Route path="/admin/tickets" element={<SuperAdminRoute><AdminTickets /></SuperAdminRoute>} />
                  <Route path="/admin/fornecedores" element={<SuperAdminRoute><AdminFornecedores /></SuperAdminRoute>} />
                  <Route path="/admin/axia-nvidia-test" element={<SuperAdminRoute><AdminAxiaNvidiaTest /></SuperAdminRoute>} />
                  <Route path="/admin/axia-gateway-test" element={<SuperAdminRoute><AdminAxiaGatewayTest /></SuperAdminRoute>} />
                  <Route path="/portal" element={<ClientRoute><PortalIndex /></ClientRoute>} />
                  <Route path="/portal/obra/:id" element={<ClientRoute><PortalObra /></ClientRoute>} />
                  <Route path="/fornecedor/auth" element={<FornecedorAuth />} />
                  <Route path="/fornecedor/aceitar" element={<FornecedorAceitarConvite />} />
                  <Route path="/fornecedor/pending" element={<FornecedorPendingApproval />} />
                  <Route path="/fornecedor/dashboard" element={<SupplierRoute><FornecedorDashboard /></SupplierRoute>} />
                  <Route path="/fornecedor/pedidos" element={<SupplierRoute><FornecedorPedidos /></SupplierRoute>} />
                  <Route path="/fornecedor/pedidos/:id" element={<SupplierRoute><FornecedorPedidoDetalhe /></SupplierRoute>} />
                  <Route path="/fornecedor/precos" element={<SupplierRoute><FornecedorPrecos /></SupplierRoute>} />
                  <Route path="/fornecedor/perfil" element={<SupplierRoute><FornecedorPerfil /></SupplierRoute>} />
                  <Route path="/legal/:slug" element={<LegalDocumentPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CookieConsent />
            </BrowserRouter>
          </AuthProvider>
        </PreferencesProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
