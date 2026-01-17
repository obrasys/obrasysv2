import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import OrcamentosPage from "./pages/orcamentos/Index";
import CriarOrcamentoPage from "./pages/orcamentos/Criar";
import EditarOrcamentoPage from "./pages/orcamentos/Editar";
import ObrasPage from "./pages/obras/Index";
import CriarObraPage from "./pages/obras/Criar";
import EditarObraPage from "./pages/obras/Editar";
import VerObraPage from "./pages/obras/Ver";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
            <Route path="/orcamentos/:id/editar" element={<EditarOrcamentoPage />} />
            <Route path="/obras" element={<ObrasPage />} />
            <Route path="/obras/criar" element={<CriarObraPage />} />
            <Route path="/obras/:id" element={<VerObraPage />} />
            <Route path="/obras/:id/editar" element={<EditarObraPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
