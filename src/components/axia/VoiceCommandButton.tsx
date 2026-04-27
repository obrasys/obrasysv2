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
  label = "Comando Axia",
}: Props) {
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<{ created_items: any[]; alerts_created: number } | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

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
      const r = await mutation.mutateAsync({
        transcript: transcript.trim(),
        sourceContext,
        obraId,
        audioBlob,
      });
      setResult({ created_items: r.created_items ?? [], alerts_created: r.alerts_created ?? 0 });
      setPhase("done");
    } catch (e: any) {
      setErrMsg(e?.message ?? "Erro ao processar com a Axia.");
      setPhase("error");
    }
  };

  if (!voiceEnabled) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          className="gap-2"
          onClick={() => setUpgradeOpen(true)}
        >
          <Sparkles className="h-4 w-4" />
          {label}
        </Button>
        <UpgradePromptModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Comando de voz Axia"
          description="O suporte de comando de voz está disponível no plano Professional. Faça upgrade para registar ações por voz."
          requiredPlan="Professional"
          currentTier={tier}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Comando Axia
          </DialogTitle>
          <DialogDescription>
            Fale o que aconteceu na obra, o que quer registar ou orçamentar. A Axia cria um rascunho para revisão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(phase === "idle" || phase === "recording" || phase === "review") && (
            <>
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
