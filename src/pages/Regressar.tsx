import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2, ArrowRight, MessageCircle } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/351918152116?text=Ol%C3%A1%2C%20quero%20regressar%20ao%20Obra%20Sys%20com%20a%20oferta%20especial";

export default function Regressar() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [showDialog, setShowDialog] = useState(false);
  const [tracked, setTracked] = useState(false);

  // Track click on mount
  useEffect(() => {
    if (tracked) return;
    setTracked(true);
    supabase
      .from("email_click_tracking")
      .insert({
        email: email || null,
        token: token || null,
        campaign: "trial-expirado-winback",
      })
      .then(() => {});

    // Show dialog after brief delay
    const t = setTimeout(() => setShowDialog(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7fb] to-white flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-8 flex items-center justify-center border-b bg-white/80 backdrop-blur">
        <img
          src="https://rwpgswjvrotshybwevog.supabase.co/storage/v1/object/public/brand-assets/logo.png"
          alt="Obra Sys"
          className="h-8"
        />
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-[#00679d]/10 text-[#00679d] px-4 py-2 rounded-full text-sm font-semibold">
            <CheckCircle className="w-4 h-4" />
            Oferta exclusiva para si
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a2e]" style={{ fontFamily: "'Red Hat Display', sans-serif" }}>
            Bem-vindo de volta ao <span className="text-[#00679d]">Obra Sys</span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed">
            Preparámos uma condição especial de regresso para si.
            Siga as instruções abaixo para ativar o seu plano com desconto.
          </p>

          <div className="bg-[#00679d] rounded-xl p-6 text-white shadow-lg">
            <p className="text-3xl font-bold">31,90€/mês</p>
            <p className="text-sm opacity-80 mt-1">durante 3 meses</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => setShowDialog(true)}
              className="bg-[#00679d] hover:bg-[#005580] text-white gap-2 text-base px-8"
            >
              <ArrowRight className="w-5 h-5" />
              Ver instruções
            </Button>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="gap-2 text-base border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </main>

      {/* Instructions Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Como ativar a sua oferta</DialogTitle>
            <DialogDescription>
              Siga estes passos simples para regressar ao Obra Sys com a condição especial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <Step
              number={1}
              title="Inicie sessão na plataforma"
              description="Aceda à sua conta com o email e password que utilizou no trial."
            />
            <Step
              number={2}
              title="Aceda à página de Planos"
              description="No menu lateral, clique em 'Planos' ou 'Subscrição'."
            />
            <Step
              number={3}
              title="Aplique o código promocional"
              description="No checkout, insira o código Trial30 e confirme o pagamento."
            />

            <div className="bg-[#f0f7fb] border border-[#00679d]/20 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">O seu código</p>
              <p className="text-2xl font-bold text-[#00679d] tracking-widest select-all">Trial30</p>
            </div>

            <Step
              number={4}
              title="Comece a usar!"
              description="A sua conta será ativada imediatamente com acesso completo durante 3 meses."
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              asChild
              className="bg-[#00679d] hover:bg-[#005580] text-white gap-2"
            >
              <a href="/auth">
                Iniciar sessão
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>

            <Button
              variant="outline"
              asChild
              className="gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                Preciso de ajuda
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t">
        © {new Date().getFullYear()} Obra Sys. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00679d] text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="font-semibold text-[#1a1a2e]">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
