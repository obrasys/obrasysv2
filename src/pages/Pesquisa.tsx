import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Star, CheckCircle2, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";

export default function Pesquisa() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { toast } = useToast();

  const [nota, setNota] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trialExtended, setTrialExtended] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Link de pesquisa inválido. Verifique o email recebido.");
  }, [token]);

  const handleSubmit = async () => {
    if (nota === 0) {
      toast({ title: "Selecione uma nota", description: "Clique nas estrelas para avaliar.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-feedback", {
        body: { token, nota, comentario },
      });

      if (fnError) throw fnError;

      if (data?.already_submitted || data?.error?.includes("já foi respondida")) {
        setError("Esta pesquisa já foi respondida. Obrigado pela sua participação!");
        return;
      }

      if (data?.error) throw new Error(data.error);

      setSubmitted(true);
      setTrialExtended(data?.trial_extended || false);
    } catch (err: any) {
      if (err?.message?.includes("já foi respondida")) {
        setError("Esta pesquisa já foi respondida. Obrigado!");
      } else {
        toast({ title: "Erro ao enviar", description: err?.message || "Tente novamente.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const notaLabels = ["", "Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoImg} alt="ObraSys" className="h-10 mx-auto mb-4" />
        </div>

        {error ? (
          <div className="bg-card rounded-2xl shadow-xl border p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-accent mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{error}</h2>
          </div>
        ) : submitted ? (
          <div className="bg-card rounded-2xl shadow-xl border p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
              <Gift className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Obrigado pelo seu feedback!</h2>
            <p className="text-muted-foreground">
              A sua opinião é muito importante para nós.
            </p>
            {trialExtended && (
              <div className="bg-accent/10 rounded-xl p-4 mt-4">
                <p className="text-accent font-semibold text-lg">
                  🎉 +30 dias grátis adicionados à sua conta!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  O seu período de teste foi alargado como agradecimento.
                </p>
              </div>
            )}
            <Button onClick={() => window.location.href = "/dashboard"} className="mt-4">
              Ir para o Dashboard
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-xl border p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Como está a ser a sua experiência?
              </h1>
              <p className="text-muted-foreground">
                Partilhe a sua opinião e ganhe{" "}
                <span className="text-accent font-semibold">+30 dias grátis</span>!
              </p>
            </div>

            {/* Star rating */}
            <div className="space-y-2">
              <Label className="text-base font-medium">A sua avaliação</Label>
              <div className="flex justify-center gap-2 py-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNota(star)}
                    onMouseEnter={() => setHoverNota(star)}
                    onMouseLeave={() => setHoverNota(0)}
                    className="transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        star <= (hoverNota || nota)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {(hoverNota || nota) > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {notaLabels[hoverNota || nota]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comentario" className="text-base font-medium">
                Conte-nos mais sobre a sua experiência
              </Label>
              <Textarea
                id="comentario"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="O que mais gosta? O que podemos melhorar? Que funcionalidades gostaria de ver?"
                className="min-h-[120px] resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {comentario.length}/2000
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || nota === 0}
              className="w-full h-12 text-base font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  A enviar...
                </>
              ) : (
                "Enviar e ganhar +30 dias grátis"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              As suas respostas são confidenciais e ajudam-nos a melhorar o produto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
