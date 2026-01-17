import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  const navLinks = [
    { label: "Funcionalidades", href: "#features" },
    { label: "Preços", href: "#pricing" },
    { label: "Sobre", href: "#about" },
    { label: "Contacto", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Obra<span className="text-accent">Sys</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {!loading && (
              user ? (
                <Link to="/dashboard">
                  <Button variant="accent">
                    Ir para Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost">Entrar</Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="accent">
                      Experimentar Grátis
                    </Button>
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                {!loading && (
                  user ? (
                    <Link to="/dashboard">
                      <Button variant="accent" className="w-full">
                        Ir para Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/auth">
                        <Button variant="outline" className="w-full">Entrar</Button>
                      </Link>
                      <Link to="/auth">
                        <Button variant="accent" className="w-full">
                          Experimentar Grátis
                        </Button>
                      </Link>
                    </>
                  )
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
