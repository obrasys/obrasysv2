import { lazy, Suspense } from "react";
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
import { Loader2 } from "lucide-react";

// Landing + Auth (keep eager for initial load)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const CriarConta = lazy(() => import("./pages/CriarConta"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const OrcamentosPage = lazy(() => import("./pages/orcamentos/Index"));
const CriarOrcamentoPage = lazy(() => import("./pages/orcamentos/Criar"));
const EditarOrcamentoPage = lazy(() => import("./pages/orcamentos/Editar"));
const VerOrcamentoPage = lazy(() => import("./pages/orcamentos/Ver"));
const EssencialPage = lazy(() => import("./pages/orcamentos/Essencial"));
const ObrasPage = lazy(() => import("./pages/obras/Index"));
const CriarObraPage = lazy(() => import("./pages/obras/Criar"));
const EditarObraPage = lazy(() => import("./pages/obras/Editar"));
const VerObraPage = lazy(() => import("./pages/obras/Ver"));
const ObraFinanceiroPage = lazy(() => import("./pages/obras/Financeiro"));
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
const PerfilPage = lazy(() => import("./pages/Perfil"));
const DefinicoesPage = lazy(() => import("./pages/Definicoes"));
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
const ImportarPage = lazy(() => import("./pages/importar/Index"));
const CadernosPage = lazy(() => import("./pages/cadernos/Index"));
const ImportarCadernoPage = lazy(() => import("./pages/cadernos/Importar"));
const ValidarCadernoPage = lazy(() => import("./pages/cadernos/Validar"));
const ResumoCadernoPage = lazy(() => import("./pages/cadernos/Resumo"));
const PlantasPage = lazy(() => import("./pages/plantas/Index"));
const AdminDashboard = lazy(() => import("./pages/admin/Index"));
const AdminUtilizadores = lazy(() => import("./pages/admin/Utilizadores"));
const AdminFinanceiroGlobal = lazy(() => import("./pages/admin/FinanceiroGlobal"));
const AdminAuditoria = lazy(() => import("./pages/admin/Auditoria"));
const AdminTemplates = lazy(() => import("./pages/admin/Templates"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const MigracaoPage = lazy(() => import("./pages/admin/Migracao"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminFornecedores = lazy(() => import("./pages/admin/Fornecedores"));
const PortalIndex = lazy(() => import("./pages/portal/Index"));
const PortalObra = lazy(() => import("./pages/portal/Obra"));
const FornecedorAuth = lazy(() => import("./pages/fornecedor/Auth"));
const FornecedorPendingApproval = lazy(() => import("./pages/fornecedor/PendingApproval"));
const FornecedorDashboard = lazy(() => import("./pages/fornecedor/Dashboard"));
const FornecedorPedidos = lazy(() => import("./pages/fornecedor/Pedidos"));
const FornecedorPedidoDetalhe = lazy(() => import("./pages/fornecedor/PedidoDetalhe"));
const FornecedorPrecos = lazy(() => import("./pages/fornecedor/Precos"));
const FornecedorPerfil = lazy(() => import("./pages/fornecedor/Perfil"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-accent" />
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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/criar-conta" element={<CriarConta />} />
                  <Route path="/auth/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<ManagerRoute><Dashboard /></ManagerRoute>} />
                  <Route path="/orcamentos" element={<ManagerRoute><OrcamentosPage /></ManagerRoute>} />
                  <Route path="/orcamentos/criar" element={<ManagerRoute><CriarOrcamentoPage /></ManagerRoute>} />
                  <Route path="/orcamentos/:id" element={<ManagerRoute><VerOrcamentoPage /></ManagerRoute>} />
                  <Route path="/orcamentos/:id/editar" element={<ManagerRoute><EditarOrcamentoPage /></ManagerRoute>} />
                  <Route path="/orcamentos/essencial/novo" element={<ManagerRoute><EssencialPage /></ManagerRoute>} />
                  <Route path="/obras" element={<ManagerRoute><ObrasPage /></ManagerRoute>} />
                  <Route path="/obras/criar" element={<ManagerRoute><CriarObraPage /></ManagerRoute>} />
                  <Route path="/obras/:id" element={<ManagerRoute><VerObraPage /></ManagerRoute>} />
                  <Route path="/obras/:id/editar" element={<ManagerRoute><EditarObraPage /></ManagerRoute>} />
                  <Route path="/obras/:id/financeiro" element={<ManagerRoute><ObraFinanceiroPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos" element={<ManagerRoute><CadernosPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/importar" element={<ManagerRoute><ImportarCadernoPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/:cadernoId/importar" element={<ManagerRoute><ImportarCadernoPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/:cadernoId/validar" element={<ManagerRoute><ValidarCadernoPage /></ManagerRoute>} />
                  <Route path="/obras/:id/cadernos/:cadernoId/resumo" element={<ManagerRoute><ResumoCadernoPage /></ManagerRoute>} />
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
                  <Route path="/perfil" element={<ManagerRoute><PerfilPage /></ManagerRoute>} />
                  <Route path="/definicoes" element={<ManagerRoute><DefinicoesPage /></ManagerRoute>} />
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
                  <Route path="/importar" element={<ManagerRoute><ImportarPage /></ManagerRoute>} />
                  <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
                  <Route path="/admin/utilizadores" element={<SuperAdminRoute><AdminUtilizadores /></SuperAdminRoute>} />
                  <Route path="/admin/financeiro" element={<SuperAdminRoute><AdminFinanceiroGlobal /></SuperAdminRoute>} />
                  <Route path="/admin/auditoria" element={<SuperAdminRoute><AdminAuditoria /></SuperAdminRoute>} />
                  <Route path="/admin/templates" element={<SuperAdminRoute><AdminTemplates /></SuperAdminRoute>} />
                  <Route path="/admin/analytics" element={<SuperAdminRoute><AdminAnalytics /></SuperAdminRoute>} />
                  <Route path="/admin/migracao" element={<SuperAdminRoute><MigracaoPage /></SuperAdminRoute>} />
                  <Route path="/admin/tickets" element={<SuperAdminRoute><AdminTickets /></SuperAdminRoute>} />
                  <Route path="/admin/fornecedores" element={<SuperAdminRoute><AdminFornecedores /></SuperAdminRoute>} />
                  <Route path="/portal" element={<ClientRoute><PortalIndex /></ClientRoute>} />
                  <Route path="/portal/obra/:id" element={<ClientRoute><PortalObra /></ClientRoute>} />
                  <Route path="/fornecedor/auth" element={<FornecedorAuth />} />
                  <Route path="/fornecedor/pending" element={<FornecedorPendingApproval />} />
                  <Route path="/fornecedor/dashboard" element={<SupplierRoute><FornecedorDashboard /></SupplierRoute>} />
                  <Route path="/fornecedor/pedidos" element={<SupplierRoute><FornecedorPedidos /></SupplierRoute>} />
                  <Route path="/fornecedor/pedidos/:id" element={<SupplierRoute><FornecedorPedidoDetalhe /></SupplierRoute>} />
                  <Route path="/fornecedor/precos" element={<SupplierRoute><FornecedorPrecos /></SupplierRoute>} />
                  <Route path="/fornecedor/perfil" element={<SupplierRoute><FornecedorPerfil /></SupplierRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              
            </BrowserRouter>
          </AuthProvider>
        </PreferencesProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
