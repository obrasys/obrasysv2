import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Mic2, Square, Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateAndProcessVoiceCommand } from "@/hooks/useAxiaVoiceIntake";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpgradePromptModal } from "@/components/subscription/UpgradePromptModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useObras } from "@/hooks/useObras";

type Props = {
  obraId?: string | null;
  sourceContext?: "global" | "project" | "financial" | "rdo" | "pre_budget";
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
};

type Phase = "idle" | "recording" | "review" | "processing" | "done" | "error";

// SpeechRecognition (browser)
const SpeechRecognitionImpl: any =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

export function VoiceCommandButton({
  obraId = null,
  sourceContext = "global",
  variant = "default",
  size = "default",
  label = "Registar por Voz",
}: Props) {
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<{ created_items: any[]; alerts_created: number } | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [selectedObraId, setSelectedObraId] = useState<string | null>(obraId ?? null);
  const [tagRdo, setTagRdo] = useState<boolean>(sourceContext === "rdo");
  const [tagFinanceiro, setTagFinanceiro] = useState<boolean>(sourceContext === "financial");

  const { obras } = useObras();

  const { hasFeature, tier } = useFeatureGate();
  // Durante o trial, o comando de voz fica disponível para todos os utilizadores experimentarem.
  const voiceEnabled = tier === "trial" || hasFeature("comandoVoz");

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const mutation = useCreateAndProcessVoiceCommand();

  const reset = () => {
    setPhase("idle");
    setTranscript("");
    setAudioBlob(null);
    setResult(null);
    setErrMsg(null);
  };

  useEffect(() => {
    if (!open) {
      // cleanup ao fechar
      try {
        recognitionRef.current?.stop?.();
        recorderRef.current?.stop?.();
      } catch {}
      reset();
    }
  }, [open]);

  const startRecording = async () => {
    setErrMsg(null);
    setTranscript("");
    setPhase("recording");

    // Web Speech API (transcrição)
    if (SpeechRecognitionImpl) {
      try {
        const rec = new SpeechRecognitionImpl();
        rec.lang = "pt-PT";
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (ev: any) => {
          let txt = "";
          for (let i = 0; i < ev.results.length; i++) {
            txt += ev.results[i][0].transcript;
          }
          setTranscript(txt.trim());
        };
        rec.onerror = (e: any) => {
          console.warn("SpeechRecognition error", e);
        };
        rec.start();
        recognitionRef.current = rec;
      } catch (e) {
        console.warn("SpeechRecognition unavailable", e);
      }
    }

    // MediaRecorder (áudio)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorderRef.current = mr;
    } catch (e) {
      console.warn("MediaRecorder unavailable", e);
    }
  };

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    try {
      recorderRef.current?.stop?.();
    } catch {}
    setPhase("review");
  };

  const send = async () => {
    const hasText = !!transcript.trim();
    const hasAudio = !!audioBlob && audioBlob.size > 0;
    if (!hasText && !hasAudio) {
      setErrMsg("Insira ou grave um comando antes de enviar.");
      return;
    }
    setPhase("processing");
    try {
      const effectiveContext: Props["sourceContext"] =
        tagRdo && !tagFinanceiro
          ? "rdo"
          : tagFinanceiro && !tagRdo
            ? "financial"
            : sourceContext;
      const r = await mutation.mutateAsync({
        transcript: transcript.trim(),
        sourceContext: effectiveContext,
        obraId: selectedObraId ?? null,
        audioBlob,
      });
      setResult({ created_items: r.created_items ?? [], alerts_created: r.alerts_created ?? 0 });
      setPhase("done");
    } catch (e: any) {
      setErrMsg(e?.message ?? "Erro ao processar com a Axia.");
      setPhase("error");
    }
  };

  const isRecording = phase === "recording";
  const isProcessing = phase === "processing";
  const isDone = phase === "done";

  const pillClasses = cn(
    "group relative inline-flex items-center gap-2 rounded-full px-4 sm:px-5 h-10",
    "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)]",
    "text-primary-foreground font-medium",
    "shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
    "transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
    isRecording && "animate-pulse ring-2 ring-destructive/60",
    isDone && "ring-2 ring-emerald-400/60",
  );

  const renderIcon = () => {
    if (isProcessing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isDone) return <CheckCircle2 className="h-4 w-4" />;
    return (
      <span className="relative inline-flex">
        <Mic2 className="h-4 w-4" />
        <Sparkles className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-amber-200 drop-shadow-[0_0_4px_rgba(255,200,80,0.7)]" />
      </span>
    );
  };

  if (!voiceEnabled) {
    return (
      <>
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className={pillClasses}
          aria-label="Registar por Voz"
          title="Criar RDO, pré-orçamento ou registo financeiro por voz"
        >
          {renderIcon()}
          <span className="hidden sm:inline">{label}</span>
        </button>
        <UpgradePromptModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Registar por Voz"
          description="O registo por voz está disponível no plano Professional. Faça upgrade para registar RDOs, pré-orçamentos e registos financeiros por voz."
          requiredPlan="Professional"
          currentTier={tier}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={pillClasses}
          aria-label="Registar por Voz"
          title="Criar RDO, pré-orçamento ou registo financeiro por voz"
        >
          {renderIcon()}
          <span className="hidden sm:inline">{label}</span>
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic2 className="h-5 w-5 text-primary" />
            Registar por Voz
          </DialogTitle>
          <DialogDescription>
            Fale o que aconteceu na obra, o que quer registar ou orçamentar. A Axia cria um rascunho para revisão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex flex-col">
          {(phase === "idle" || phase === "recording" || phase === "review") && (
            <>
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Obra associada (opcional)</Label>
                  <Select
                    value={selectedObraId ?? "__none__"}
                    onValueChange={(v) => setSelectedObraId(v === "__none__" ? null : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sem obra específica" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem obra específica</SelectItem>
                      {(obras ?? []).map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tipo de registo</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={tagRdo}
                        onCheckedChange={(v) => setTagRdo(v === true)}
                      />
                      RDO (Relatório Diário de Obra)
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={tagFinanceiro}
                        onCheckedChange={(v) => setTagFinanceiro(v === true)}
                      />
                      Financeiro
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Se nada for selecionado, a Axia infere o tipo a partir do que disser.
                  </p>
                </div>
              </div>

              <Textarea
                placeholder='Ex.: "10€ para almoço na obra X" ou "Hoje fizemos reboco, falta cimento e ferro".'
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
              />
              {!SpeechRecognitionImpl && (
                <p className="text-xs text-muted-foreground">
                  O seu navegador não transcreve em tempo real. Pode gravar o áudio e a Axia transcreve automaticamente, ou escrever o comando.
                </p>
              )}
              {phase === "review" && !transcript.trim() && audioBlob && (
                <p className="text-xs text-primary">
                  Áudio gravado ({Math.round((audioBlob.size / 1024))} KB). A Axia vai transcrever ao enviar.
                </p>
              )}
              {errMsg && <p className="text-xs text-destructive">{errMsg}</p>}

              <div className="flex items-center gap-2">
                {phase !== "recording" ? (
                  <Button onClick={startRecording} variant="secondary" className="gap-2" type="button">
                    <Mic className="h-4 w-4" />
                    Iniciar gravação
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="gap-2" type="button">
                    <Square className="h-4 w-4" />
                    Parar gravação
                  </Button>
                )}
                {phase === "recording" && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    A Axia está a ouvir...
                  </span>
                )}
              </div>
            </>
          )}

          {phase === "processing" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A Axia está a processar o comando...</p>
            </div>
          )}

          {phase === "done" && result && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>A Axia criou um rascunho para revisão.</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.created_items.map((it, idx) => (
                  <Badge key={idx} variant="secondary">
                    {it.type} · {it.status}
                  </Badge>
                ))}
                {result.alerts_created > 0 && (
                  <Badge variant="outline">{result.alerts_created} alerta(s)</Badge>
                )}
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <span>{errMsg}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <div className="flex gap-2">
            {phase === "done" && (
              <Button asChild variant="outline">
                <Link to="/axia/inbox" onClick={() => setOpen(false)}>Rever agora</Link>
              </Button>
            )}
            {(phase === "idle" || phase === "review" || phase === "error") && (
              <Button
                onClick={send}
                disabled={(!transcript.trim() && !(audioBlob && audioBlob.size > 0)) || mutation.isPending}
                className="gap-2"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar para Axia
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VoiceCommandButton;
