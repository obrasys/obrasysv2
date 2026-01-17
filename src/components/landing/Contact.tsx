import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Mail, Phone, Clock, User, Building, Check } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    empresa: "",
    mensagem: "",
    agendarDemo: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Mensagem enviada com sucesso! Entraremos em contacto brevemente.");
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      empresa: "",
      mensagem: "",
      agendarDemo: false,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const benefits = [
    "Solução 100% portuguesa",
    "Interface intuitiva e móvel",
    "Suporte especializado",
    "Demonstração gratuita",
  ];

  return (
    <section id="contact" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Entre em Contacto
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pronto para revolucionar a gestão dos seus projetos?
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left Column - Contact Info */}
          <div className="space-y-6">
            {/* Contact Information Card */}
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border">
              <h3 className="font-display text-xl font-bold text-foreground mb-6">
                Informações de Contacto
              </h3>
              <div className="space-y-5">
                <a 
                  href="mailto:suporte@obrasys.pt" 
                  className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-5 h-5 text-primary" />
                  <span>suporte@obrasys.pt</span>
                </a>
                <a 
                  href="tel:+351935502656" 
                  className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-5 h-5 text-primary" />
                  <span>+351 935 502 656</span>
                </a>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>Seg-Sex: 9h-18h</span>
                </div>
              </div>
            </div>

            {/* Why Choose Card */}
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border">
              <h3 className="font-display text-xl font-bold text-foreground mb-6">
                Porquê Escolher o Obra sys?
              </h3>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="bg-card rounded-2xl p-8 shadow-card border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome & Email */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="flex items-center gap-2 text-foreground">
                    <User className="w-4 h-4" />
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    placeholder="O seu nome completo"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                    <Mail className="w-4 h-4" />
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="o.seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Telefone & Empresa */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="flex items-center gap-2 text-foreground">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    placeholder="+351 123 456 789"
                    value={formData.telefone}
                    onChange={handleChange}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="flex items-center gap-2 text-foreground">
                    <Building className="w-4 h-4" />
                    Empresa
                  </Label>
                  <Input
                    id="empresa"
                    name="empresa"
                    placeholder="Nome da empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Mensagem */}
              <div className="space-y-2">
                <Label htmlFor="mensagem" className="text-foreground">
                  Mensagem
                </Label>
                <Textarea
                  id="mensagem"
                  name="mensagem"
                  placeholder="Descreva as suas necessidades e como podemos ajudar..."
                  value={formData.mensagem}
                  onChange={handleChange}
                  rows={4}
                  className="bg-background resize-none"
                />
              </div>

              {/* Checkbox */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="agendarDemo"
                  checked={formData.agendarDemo}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, agendarDemo: checked === true }))
                  }
                />
                <Label htmlFor="agendarDemo" className="text-muted-foreground cursor-pointer">
                  Pretendo agendar uma demonstração gratuita
                </Label>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg">
                Enviar Mensagem
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
