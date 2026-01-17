import { Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  const footerLinks = {
    produto: [
      { label: "Funcionalidades", href: "#features" },
      { label: "Preços", href: "#pricing" },
      { label: "Integrações", href: "#" },
      { label: "Atualizações", href: "#" },
    ],
    empresa: [
      { label: "Sobre Nós", href: "#about" },
      { label: "Blog", href: "#" },
      { label: "Carreiras", href: "#" },
      { label: "Contacto", href: "#contact" },
    ],
    legal: [
      { label: "Termos de Serviço", href: "#" },
      { label: "Política de Privacidade", href: "#" },
      { label: "Política de Cookies", href: "#" },
      { label: "Acessibilidade", href: "#" },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center mb-4">
              <img 
                src={logo} 
                alt="ObraSys" 
                className="h-10 w-auto brightness-0 invert" 
              />
            </a>
            <p className="text-primary-foreground/70 mb-6 max-w-xs">
              A plataforma de gestão de obras mais completa de Portugal. 
              Simplifique processos e aumente a produtividade.
            </p>
            <div className="space-y-3">
              <a href="mailto:info@obrasys.pt" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail className="w-4 h-4" />
                <span className="text-sm">info@obrasys.pt</span>
              </a>
              <a href="tel:+351210000000" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+351 210 000 000</span>
              </a>
              <div className="flex items-center gap-2 text-primary-foreground/70">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Lisboa, Portugal</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Produto</h4>
            <ul className="space-y-3">
              {footerLinks.produto.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Empresa</h4>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/60 text-sm">
            © {new Date().getFullYear()} ObraSys. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-primary-foreground/60 text-sm">Made with ❤️ in Portugal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
