import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { SuperAdminRoute } from "./components/admin/SuperAdminRoute";
import { ClientRoute } from "./components/portal/ClientRoute";
import { ManagerRoute } from "./components/portal/ManagerRoute";

// Direct imports (no lazy loading)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CriarConta from "./pages/CriarConta";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import OrcamentosPage from "./pages/orcamentos/Index";
import CriarOrcamentoPage from "./pages/orcamentos/Criar";
import EditarOrcamentoPage from "./pages/orcamentos/Editar";
import VerOrcamentoPage from "./pages/orcamentos/Ver";
import ObrasPage from "./pages/obras/Index";
import CriarObraPage from "./pages/obras/Criar";
import EditarObraPage from "./pages/obras/Editar";
import VerObraPage from "./pages/obras/Ver";
import ObraFinanceiroPage from "./pages/obras/Financeiro";
import ClientesPage from "./pages/clientes/Index";
import CriarClientePage from "./pages/clientes/Criar";
import EditarClientePage from "./pages/clientes/Editar";
import VerClientePage from "./pages/clientes/Ver";
import RDOsPage from "./pages/rdos/Index";
import CriarRDOPage from "./pages/rdos/Criar";
import EditarRDOPage from "./pages/rdos/Editar";
import VerRDOPage from "./pages/rdos/Ver";
import TarefasPage from "./pages/tarefas/Index";
import ConformidadePage from "./pages/conformidade/Index";
import BasePrecosPage from "./pages/base-precos/Index";
import BasePrecosInserirPage from "./pages/base-precos/Inserir";
import BasePrecosAuditoriaPage from "./pages/base-precos/Auditoria";
import SuportePage from "./pages/suporte/Index";
import FinanceiroPage from "./pages/financeiro/Index";
import FornecedoresPage from "./pages/financeiro/Fornecedores";
import PerfilPage from "./pages/Perfil";
import DefinicoesPage from "./pages/Definicoes";
import NotFound from "./pages/NotFound";
import CadernosPage from "./pages/cadernos/Index";
import ImportarCadernoPage from "./pages/cadernos/Importar";
import ValidarCadernoPage from "./pages/cadernos/Validar";
import ResumoCadernoPage from "./pages/cadernos/Resumo";
import MigracaoPage from "./pages/admin/Migracao";
import AdminDashboard from "./pages/admin/Index";
import AdminUtilizadores from "./pages/admin/Utilizadores";
import AdminFinanceiroGlobal from "./pages/admin/FinanceiroGlobal";
import AdminAuditoria from "./pages/admin/Auditoria";
import AdminTemplates from "./pages/admin/Templates";
import AdminAnalytics from "./pages/admin/Analytics";
import PlanosPage from "./pages/Planos";
import SubscricaoPage from "./pages/Subscricao";
import PesquisaPage from "./pages/Pesquisa";
import RecursosPage from "./pages/recursos/Index";
import RelatoriosPage from "./pages/relatorios/Index";
import VerMembroPage from "./pages/recursos/VerMembro";
import AutosMedicaoPage from "./pages/autos-medicao/Index";
import CriarAutoMedicaoPage from "./pages/autos-medicao/Criar";
import EditarAutoMedicaoPage from "./pages/autos-medicao/Editar";
import VerAutoMedicaoPage from "./pages/autos-medicao/Ver";
import PortalIndex from "./pages/portal/Index";
import PortalObra from "./pages/portal/Obra";
import InstalacoesIndex from "./pages/instalacoes/Index";
import FornecedorAuth from "./pages/fornecedor/Auth";
import FornecedorPendingApproval from "./pages/fornecedor/PendingApproval";
import FornecedorDashboard from "./pages/fornecedor/Dashboard";
import FornecedorPedidos from "./pages/fornecedor/Pedidos";
import FornecedorPedidoDetalhe from "./pages/fornecedor/PedidoDetalhe";
import FornecedorPrecos from "./pages/fornecedor/Precos";
import FornecedorPerfil from "./pages/fornecedor/Perfil";
import AdminFornecedores from "./pages/admin/Fornecedores";
import { SupplierRoute } from "./components/fornecedor/SupplierRoute";
import EletricaPage from "./pages/instalacoes/Eletrica";
import CanalizacaoPage from "./pages/instalacoes/Canalizacao";
import TelecomPage from "./pages/instalacoes/Telecom";
import ConfigurarInstalacoesPage from "./pages/instalacoes/Configurar";
import RedeFornecedoresPage from "./pages/rede-fornecedores/Index";
import AxiaPage from "./pages/axia/Index";
import ImportarPage from "./pages/importar/Index";
import EssencialPage from "./pages/orcamentos/Essencial";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PreferencesProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              {/* Cadernos de Encargos */}
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
              <Route path="/relatorios" element={<ManagerRoute><RelatoriosPage /></ManagerRoute>} />
              {/* Autos de Medição */}
              <Route path="/autos-medicao" element={<ManagerRoute><AutosMedicaoPage /></ManagerRoute>} />
              <Route path="/autos-medicao/criar" element={<ManagerRoute><CriarAutoMedicaoPage /></ManagerRoute>} />
              <Route path="/autos-medicao/:id" element={<ManagerRoute><VerAutoMedicaoPage /></ManagerRoute>} />
              <Route path="/autos-medicao/:id/editar" element={<ManagerRoute><EditarAutoMedicaoPage /></ManagerRoute>} />
              {/* Instalações */}
              <Route path="/instalacoes" element={<ManagerRoute><InstalacoesIndex /></ManagerRoute>} />
              <Route path="/instalacoes/eletrica" element={<ManagerRoute><EletricaPage /></ManagerRoute>} />
              <Route path="/instalacoes/canalizacao" element={<ManagerRoute><CanalizacaoPage /></ManagerRoute>} />
              <Route path="/instalacoes/telecom" element={<ManagerRoute><TelecomPage /></ManagerRoute>} />
              <Route path="/instalacoes/configurar" element={<ManagerRoute><ConfigurarInstalacoesPage /></ManagerRoute>} />
              <Route path="/rede-fornecedores" element={<ManagerRoute><RedeFornecedoresPage /></ManagerRoute>} />
              <Route path="/axia" element={<ManagerRoute><AxiaPage /></ManagerRoute>} />
              <Route path="/importar" element={<ManagerRoute><ImportarPage /></ManagerRoute>} />
              {/* Admin - Super Admin Only */}
              <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
              <Route path="/admin/utilizadores" element={<SuperAdminRoute><AdminUtilizadores /></SuperAdminRoute>} />
              <Route path="/admin/financeiro" element={<SuperAdminRoute><AdminFinanceiroGlobal /></SuperAdminRoute>} />
              <Route path="/admin/auditoria" element={<SuperAdminRoute><AdminAuditoria /></SuperAdminRoute>} />
              <Route path="/admin/templates" element={<SuperAdminRoute><AdminTemplates /></SuperAdminRoute>} />
              <Route path="/admin/analytics" element={<SuperAdminRoute><AdminAnalytics /></SuperAdminRoute>} />
              <Route path="/admin/migracao" element={<SuperAdminRoute><MigracaoPage /></SuperAdminRoute>} />
              {/* Portal do Cliente */}
              <Route path="/portal" element={<ClientRoute><PortalIndex /></ClientRoute>} />
              <Route path="/portal/obra/:id" element={<ClientRoute><PortalObra /></ClientRoute>} />
              {/* Portal do Fornecedor */}
              <Route path="/fornecedor/auth" element={<FornecedorAuth />} />
              <Route path="/fornecedor/pending" element={<FornecedorPendingApproval />} />
              <Route path="/fornecedor/dashboard" element={<SupplierRoute><FornecedorDashboard /></SupplierRoute>} />
              <Route path="/fornecedor/pedidos" element={<SupplierRoute><FornecedorPedidos /></SupplierRoute>} />
              <Route path="/fornecedor/pedidos/:id" element={<SupplierRoute><FornecedorPedidoDetalhe /></SupplierRoute>} />
              <Route path="/fornecedor/precos" element={<SupplierRoute><FornecedorPrecos /></SupplierRoute>} />
              <Route path="/fornecedor/perfil" element={<SupplierRoute><FornecedorPerfil /></SupplierRoute>} />
              {/* Admin Fornecedores */}
              <Route path="/admin/fornecedores" element={<SuperAdminRoute><AdminFornecedores /></SuperAdminRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </PreferencesProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
