import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
// Cadernos de Encargos
import CadernosPage from "./pages/cadernos/Index";
import ImportarCadernoPage from "./pages/cadernos/Importar";
import ValidarCadernoPage from "./pages/cadernos/Validar";
import ResumoCadernoPage from "./pages/cadernos/Resumo";
// Admin
import MigracaoPage from "./pages/admin/Migracao";
import AdminDashboard from "./pages/admin/Index";
import AdminUtilizadores from "./pages/admin/Utilizadores";
import AdminFinanceiroGlobal from "./pages/admin/FinanceiroGlobal";
import AdminAuditoria from "./pages/admin/Auditoria";
import AdminTemplates from "./pages/admin/Templates";
import PlanosPage from "./pages/Planos";
import SubscricaoPage from "./pages/Subscricao";
import RecursosPage from "./pages/recursos/Index";
import { SuperAdminRoute } from "./components/admin/SuperAdminRoute";

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
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orcamentos" element={<OrcamentosPage />} />
              <Route path="/orcamentos/criar" element={<CriarOrcamentoPage />} />
              <Route path="/orcamentos/:id" element={<VerOrcamentoPage />} />
              <Route path="/orcamentos/:id/editar" element={<EditarOrcamentoPage />} />
              <Route path="/obras" element={<ObrasPage />} />
              <Route path="/obras/criar" element={<CriarObraPage />} />
              <Route path="/obras/:id" element={<VerObraPage />} />
              <Route path="/obras/:id/editar" element={<EditarObraPage />} />
              <Route path="/obras/:id/financeiro" element={<ObraFinanceiroPage />} />
              {/* Cadernos de Encargos */}
              <Route path="/obras/:id/cadernos" element={<CadernosPage />} />
              <Route path="/obras/:id/cadernos/importar" element={<ImportarCadernoPage />} />
              <Route path="/obras/:id/cadernos/:cadernoId/importar" element={<ImportarCadernoPage />} />
              <Route path="/obras/:id/cadernos/:cadernoId/validar" element={<ValidarCadernoPage />} />
              <Route path="/obras/:id/cadernos/:cadernoId/resumo" element={<ResumoCadernoPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/criar" element={<CriarClientePage />} />
              <Route path="/clientes/:id" element={<VerClientePage />} />
              <Route path="/clientes/:id/editar" element={<EditarClientePage />} />
              <Route path="/rdos" element={<RDOsPage />} />
              <Route path="/rdos/criar" element={<CriarRDOPage />} />
              <Route path="/rdos/:id" element={<VerRDOPage />} />
              <Route path="/rdos/:id/editar" element={<EditarRDOPage />} />
              <Route path="/tarefas" element={<TarefasPage />} />
              <Route path="/conformidade" element={<ConformidadePage />} />
              <Route path="/base-precos" element={<BasePrecosPage />} />
              <Route path="/base-precos/inserir" element={<BasePrecosInserirPage />} />
              <Route path="/base-precos/auditoria" element={<BasePrecosAuditoriaPage />} />
              <Route path="/suporte" element={<SuportePage />} />
              <Route path="/financeiro" element={<FinanceiroPage />} />
              <Route path="/financeiro/fornecedores" element={<FornecedoresPage />} />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/definicoes" element={<DefinicoesPage />} />
              <Route path="/planos" element={<PlanosPage />} />
              <Route path="/subscricao" element={<SubscricaoPage />} />
              <Route path="/recursos" element={<RecursosPage />} />
              {/* Admin - Super Admin Only */}
              <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
              <Route path="/admin/utilizadores" element={<SuperAdminRoute><AdminUtilizadores /></SuperAdminRoute>} />
              <Route path="/admin/financeiro" element={<SuperAdminRoute><AdminFinanceiroGlobal /></SuperAdminRoute>} />
              <Route path="/admin/auditoria" element={<SuperAdminRoute><AdminAuditoria /></SuperAdminRoute>} />
              <Route path="/admin/templates" element={<SuperAdminRoute><AdminTemplates /></SuperAdminRoute>} />
              <Route path="/admin/migracao" element={<SuperAdminRoute><MigracaoPage /></SuperAdminRoute>} />
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
