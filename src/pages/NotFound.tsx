import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEO
        title="Página não encontrada (404) - ObraSys"
        description="A página que procura não existe ou foi movida. Volte ao início para continuar a navegar no ObraSys."
        path={location.pathname}
        noindex
      />
      <div className="text-center">
        <a href="/" className="flex items-center justify-center mb-8">
          <img
            src={logo}
            alt="ObraSys Logo"
            className="h-12 w-auto"
          />
        </a>
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
