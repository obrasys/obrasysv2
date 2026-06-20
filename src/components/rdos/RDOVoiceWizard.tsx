import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Mic2,
  Square,
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  RotateCcw,
  X,
  Cloud,
  Users,
  AlertTriangle,
  MessageSquare,
  Camera,
  Package,
  ClipboardCheck,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useObras } from "@/hooks/useObras";
import { useRDOs } from "@/hooks/useRDOs";
import { useProjectMaterialRequests } from "@/hooks/useProjectResources";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpgradePromptModal } from "@/components/subscription/UpgradePromptModal";
import { RDOImageUpload } from "./RDOImageUpload";
import { CONDICOES_METEOROLOGICAS } from "@/types/rdos";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type StepId =
  | "obra"
  | "weather"
  | "workforce"
  | "works"
  | "occurrences"
  | "observations"
  | "photos"
  | "materials"
  | "review";

type Props = {
  obraId?: string | null;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
  onCreated?: (rdoId: string) => void;
  /** Quando definido, o componente fica controlado externamente e o trigger interno fica escondido. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

const SpeechRecognitionImpl: any =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

const STEP_ORDER: StepId[] = [
  "obra",
  "weather",
  "workforce",
  "works",
  "occurrences",
  "observations",
  "photos",
  "materials",
  "review",
];

const STEP_META: Record<
  StepId,
  { title: string; question: string; icon: any; canSkip: boolean }
> = {
  obra: {
    title: "Obra",
    question: "Para que obra é este RDO? Pode selecionar manualmente em baixo.",
    icon: Mic2,
    canSkip: false,
  },
  weather: {
    title: "Condições meteorológicas",
    question: "Quais foram as condições meteorológicas de hoje na obra?",
    icon: Cloud,
    canSkip: true,
  },
  workforce: {
    title: "Mão de obra presente",
    question:
      "Qual foi a mão de obra presente hoje? Pode indicar equipas, funções e quantidades.",
    icon: Users,
    canSkip: true,
  },
  works: {
    title: "Trabalhos realizados",
    question:
      "Que trabalhos foram realizados hoje? Descreva tarefas, frentes e locais.",
    icon: HardHat,
    canSkip: false,
  },
  occurrences: {
    title: "Ocorrências",
    question: "Houve alguma ocorrência hoje na obra? Diga \"não\" se não houve.",
    icon: AlertTriangle,
    canSkip: true,
  },
  observations: {
    title: "Observações",
    question: "Tem alguma observação adicional sobre o dia de trabalho?",
    icon: MessageSquare,
    canSkip: true,
  },
  photos: {
    title: "Fotos",
    question: "Deseja adicionar fotos ao registo?",
    icon: Camera,
    canSkip: true,
  },
  materials: {
    title: "Material para o dia seguinte",
    question: "Que materiais serão necessários para o dia seguinte?",
    icon: Package,
    canSkip: true,
  },
  review: {
    title: "Revisão e gravação",
    question: "Confirme os dados e diga \"gravar\" para finalizar.",
    icon: ClipboardCheck,
    canSkip: false,
  },
};

// Mapeia transcrição livre para um valor do enum de meteorologia
function mapWeather(text: string): string | null {
  const t = text.toLowerCase();
  if (/(chuva\s*forte|temporal|tempestade|aguaceiro forte)/.test(t)) return "chuva_forte";
  if (/(chuva|chuvis|chove|chuvoso)/.test(t)) return "chuva_fraca";
  if (/(vento|ventania|ventoso)/.test(t)) return "vento";
  if (/(frio|gel|gelado)/.test(t)) return "frio";
  if (/(calor|quente|tórrido|toxico)/.test(t)) return "calor";
  if (/(nublado|nuvens|encoberto)/.test(t)) return "nublado";
  if (/(sol|bom tempo|limpo|céu limpo|ceu limpo)/.test(t)) return "bom";
  return null;
}

function isNegative(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return /^(n[aã]o|nada|nenhum[ao]?|sem (ocorr|observa|materi)|n\.?\s*a\.?)/.test(t);
}

function extractFirstNumber(text: string): number | undefined {
  const m = text.match(/\b(\d+)\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

function detectCommand(text: string):
  | "repetir"
  | "corrigir"
  | "voltar"
  | "saltar"
  | "continuar"
  | "gravar"
  | "cancelar"
  | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/^(repetir|repete)\b/.test(t)) return "repetir";
  if (/^(corrigir|corrige|apagar)\b/.test(t)) return "corrigir";
  if (/^(voltar|anterior)\b/.test(t)) return "voltar";
  if (/^(saltar|pular|skip|ignorar)\b/.test(t)) return "saltar";
  if (/^(continuar|próximo|proximo|seguinte|avançar|avancar)\b/.test(t)) return "continuar";
  if (/^(gravar|guardar|finalizar|terminar)\b/.test(t)) return "gravar";
  if (/^(cancelar|sair)\b/.test(t)) return "cancelar";
  return null;
}

export function RDOVoiceWizard({
  obraId: initialObraId = null,
  variant = "outline",
  size = "default",
  label = "Registar por Voz",
  onCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: Props) {
  const isControlled = typeof controlledOpen === "boolean";
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? (controlledOpen as boolean) : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) controlledOnOpenChange?.(v);
    else setInternalOpen(v);
  };
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedObraId, setSelectedObraId] = useState<string | null>(initialObraId);
  const [weatherValue, setWeatherValue] = useState<string>("");
  const [workforceText, setWorkforceText] = useState<string>("");
  const [worksText, setWorksText] = useState<string>("");
  const [occurrencesText, setOccurrencesText] = useState<string>("");
  const [observationsText, setObservationsText] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [materialsText, setMaterialsText] = useState<string>("");

  const recognitionRef = useRef<any>(null);

  const { toast } = useToast();
  const { obras } = useObras();
  const { createRDO } = useRDOs();
  const { createRequest } = useProjectMaterialRequests(selectedObraId ?? undefined);
  const { hasFeature, tier } = useFeatureGate();
  const voiceEnabled = tier === "trial" || hasFeature("comandoVoz");

  const obrasAtivas = useMemo(
    () => (obras ?? []).filter((o: any) => o.status === "em_curso" || o.status === "planeamento"),
    [obras]
  );

  const currentStep = STEP_ORDER[stepIdx];
  const meta = STEP_META[currentStep];

  const reset = () => {
    setStepIdx(0);
    setTranscript("");
    setRecording(false);
    setWeatherValue("");
    setWorkforceText("");
    setWorksText("");
    setOccurrencesText("");
    setObservationsText("");
    setPhotos([]);
    setMaterialsText("");
    setSelectedObraId(initialObraId);
  };

  useEffect(() => {
    if (!open) {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
      reset();
    } else if (initialObraId && !selectedObraId) {
      setSelectedObraId(initialObraId);
    }
  }, [open]);

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setRecording(false);
  };

  const startRecording = () => {
    if (!SpeechRecognitionImpl) {
      toast({
        title: "Transcrição indisponível",
        description: "O seu navegador não suporta reconhecimento de voz. Preencha manualmente.",
        variant: "destructive",
      });
      return;
    }
    setTranscript("");
    setRecording(true);
    try {
      const rec = new SpeechRecognitionImpl();
      rec.lang = "pt-PT";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev: any) => {
        let txt = "";
        for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
        setTranscript(txt.trim());
      };
      rec.onerror = () => setRecording(false);
      rec.onend = () => setRecording(false);
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn("SpeechRecognition error", e);
      setRecording(false);
    }
  };

  // Aplica a transcrição ao campo da etapa atual
  const applyTranscriptToCurrentStep = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    switch (currentStep) {
      case "weather": {
        const mapped = mapWeather(text);
        setWeatherValue(mapped ?? text);
        break;
      }
      case "workforce":
        setWorkforceText(text);
        break;
      case "works":
        setWorksText(text);
        break;
      case "occurrences":
        setOccurrencesText(isNegative(text) ? "Sem ocorrências registadas" : text);
        break;
      case "observations":
        setObservationsText(isNegative(text) ? "" : text);
        break;
      case "materials":
        setMaterialsText(isNegative(text) ? "" : text);
        break;
      default:
        break;
    }
  };

  const goNext = () => {
    if (stepIdx === 0 && !selectedObraId) {
      toast({
        title: "Selecione uma obra",
        description: "É necessário escolher a obra para este RDO.",
        variant: "destructive",
      });
      return;
    }
    if (recording) stopRecording();
    applyTranscriptToCurrentStep(transcript);
    setTranscript("");
    setStepIdx((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  };

  const goBack = () => {
    if (recording) stopRecording();
    setTranscript("");
    setStepIdx((i) => Math.max(i - 1, 0));
  };

  const goSkip = () => {
    if (!meta.canSkip) return;
    if (recording) stopRecording();
    setTranscript("");
    setStepIdx((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  };

  // Reage a comandos de voz na transcrição
  useEffect(() => {
    if (!transcript) return;
    const cmd = detectCommand(transcript);
    if (!cmd) return;
    if (cmd === "repetir") {
      setTranscript("");
      startRecording();
    } else if (cmd === "corrigir") {
      setTranscript("");
    } else if (cmd === "voltar") {
      goBack();
    } else if (cmd === "saltar") {
      goSkip();
    } else if (cmd === "continuar") {
      goNext();
    } else if (cmd === "cancelar") {
      setOpen(false);
    } else if (cmd === "gravar" && currentStep === "review") {
      void handleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const handleSave = async () => {
    if (!selectedObraId) {
      toast({
        title: "Obra em falta",
        description: "Selecione a obra antes de gravar.",
        variant: "destructive",
      });
      setStepIdx(0);
      return;
    }
    setSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const workforceNum = extractFirstNumber(workforceText);

      // Apenas envia valor de meteorologia se for um enum válido
      const validWeather = CONDICOES_METEOROLOGICAS.find((c) => c.value === weatherValue)
        ? weatherValue
        : undefined;

      const trabalhosExecutadosParts: string[] = [];
      if (workforceText.trim()) {
        trabalhosExecutadosParts.push(`Mão de obra presente:\n${workforceText.trim()}`);
      }
      const trabalhosExecutados =
        trabalhosExecutadosParts.join("\n\n") || "Registo criado por voz.";

      const rdo = await createRDO.mutateAsync({
        obra_id: selectedObraId,
        data: today,
        condicoes_meteorologicas: validWeather,
        mao_de_obra_presente: workforceNum,
        trabalhos_executados: trabalhosExecutados,
        ocorrencias: occurrencesText || undefined,
        observacoes: observationsText || undefined,
        fotos: photos,
      } as any);

      // Cria pedido de material para o dia seguinte (texto livre)
      if (materialsText.trim()) {
        try {
          const tomorrow = format(addDays(new Date(today), 1), "yyyy-MM-dd");
          await createRequest.mutateAsync({
            project_id: selectedObraId,
            rdo_id: rdo.id,
            needed_for_date: tomorrow,
            free_text_item_name: materialsText.trim(),
            item_type: "material",
            quantity: 1,
            unit: "un",
            priority: "normal",
            notes: "Registado por voz",
          } as any);
        } catch (e) {
          console.warn("Falha ao registar material via voz", e);
        }
      }

      onCreated?.(rdo.id);
      setOpen(false);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const isDuplicate = msg.includes("duplicate key") || msg.includes("Já existe um RDO");
      toast({
        title: isDuplicate ? "RDO já existe para hoje" : "Erro ao gravar RDO",
        description: isDuplicate
          ? "Já existe um RDO desta obra com a data de hoje. Edite o existente em vez de criar um novo."
          : msg || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  const pillClasses = cn(
    "group relative inline-flex items-center gap-2 rounded-full px-4 sm:px-5 h-10",
    "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)]",
    "text-primary-foreground font-medium",
    "shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
    "transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
    variant === "outline" && "bg-transparent border border-primary/40 text-primary"
  );

  if (!voiceEnabled) {
    return (
      <>
        <button type="button" onClick={() => setUpgradeOpen(true)} className={pillClasses}>
          <Mic2 className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
        <UpgradePromptModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          title="Registar por Voz"
          description="Disponível no plano Professional."
          requiredPlan="Professional"
          currentTier={tier}
        />
      </>
    );
  }

  const StepIcon = meta.icon;
  const obraNome = obrasAtivas.find((o: any) => o.id === selectedObraId)?.nome ?? "—";
  const weatherLabel =
    CONDICOES_METEOROLOGICAS.find((c) => c.value === weatherValue)?.label ?? weatherValue ?? "—";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <button type="button" className={pillClasses} aria-label="Registar RDO por Voz">
            <span className="relative inline-flex">
              <Mic2 className="h-4 w-4" />
              <Sparkles className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-amber-200" />
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 gap-3 sm:gap-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <StepIcon className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">Registar RDO por Voz</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Vou fazer perguntas em sequência e preencher cada campo automaticamente.
          </DialogDescription>
        </DialogHeader>


        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 min-w-[16px] rounded-full transition-colors",
                i < stepIdx && "bg-primary",
                i === stepIdx && "bg-primary/70",
                i > stepIdx && "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Etapa {stepIdx + 1} de {STEP_ORDER.length} · {meta.title}
        </p>

        <div className="space-y-4">
          {/* Pergunta da Axia */}
          <div className="rounded-lg border bg-primary/5 p-3 flex gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm">{meta.question}</p>
          </div>

          {/* Conteúdo por etapa */}
          {currentStep === "obra" && (
            <div className="space-y-2">
              <Label className="text-xs">Obra</Label>
              <Select
                value={selectedObraId ?? ""}
                onValueChange={(v) => setSelectedObraId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar obra..." />
                </SelectTrigger>
                <SelectContent>
                  {obrasAtivas.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {currentStep === "weather" && (
            <div className="space-y-2">
              <Label className="text-xs">Condições meteorológicas</Label>
              <Select value={weatherValue} onValueChange={setWeatherValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar ou ditar..." />
                </SelectTrigger>
                <SelectContent>
                  {CONDICOES_METEOROLOGICAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {currentStep === "workforce" && (
            <div className="space-y-2">
              <Label className="text-xs">Mão de obra presente</Label>
              <Textarea
                rows={3}
                placeholder="Ex.: 2 pedreiros, 1 servente, equipa de canalização (3 pessoas)"
                value={workforceText}
                onChange={(e) => setWorkforceText(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Vou tentar extrair o total. Pode corrigir manualmente.
              </p>
            </div>
          )}

          {currentStep === "occurrences" && (
            <Textarea
              rows={3}
              placeholder='Ex.: "Sem ocorrências" ou descreva o que aconteceu.'
              value={occurrencesText}
              onChange={(e) => setOccurrencesText(e.target.value)}
            />
          )}

          {currentStep === "observations" && (
            <Textarea
              rows={3}
              placeholder="Observações adicionais..."
              value={observationsText}
              onChange={(e) => setObservationsText(e.target.value)}
            />
          )}

          {currentStep === "photos" && (
            <div className="space-y-2">
              <RDOImageUpload existingPhotos={photos} onPhotosChange={setPhotos} />
              <p className="text-[11px] text-muted-foreground">
                Adicione quantas fotos quiser. Pode continuar quando terminar.
              </p>
            </div>
          )}

          {currentStep === "materials" && (
            <Textarea
              rows={3}
              placeholder="Ex.: 10 sacos de cimento, 200 tijolos, ferro de 10mm"
              value={materialsText}
              onChange={(e) => setMaterialsText(e.target.value)}
            />
          )}

          {currentStep === "review" && (
            <div className="rounded-lg border divide-y text-sm">
              <ReviewRow icon={Mic2} label="Obra" value={obraNome} onEdit={() => setStepIdx(0)} />
              <ReviewRow
                icon={Cloud}
                label="Condições meteorológicas"
                value={weatherLabel}
                onEdit={() => setStepIdx(1)}
              />
              <ReviewRow
                icon={Users}
                label="Mão de obra"
                value={workforceText || "—"}
                onEdit={() => setStepIdx(2)}
              />
              <ReviewRow
                icon={AlertTriangle}
                label="Ocorrências"
                value={occurrencesText || "—"}
                onEdit={() => setStepIdx(3)}
              />
              <ReviewRow
                icon={MessageSquare}
                label="Observações"
                value={observationsText || "—"}
                onEdit={() => setStepIdx(4)}
              />
              <ReviewRow
                icon={Camera}
                label="Fotos"
                value={`${photos.length} foto(s)`}
                onEdit={() => setStepIdx(5)}
              />
              <ReviewRow
                icon={Package}
                label="Material amanhã"
                value={materialsText || "—"}
                onEdit={() => setStepIdx(6)}
              />
            </div>
          )}

          {/* Área de gravação de voz (não aparece nas etapas que não usam transcrição) */}
          {currentStep !== "photos" && currentStep !== "obra" && currentStep !== "review" && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Resposta por voz
                </span>
                {recording ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={stopRecording}
                    className="gap-2"
                  >
                    <Square className="h-3.5 w-3.5" /> Parar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={startRecording}
                    className="gap-2"
                  >
                    <Mic className="h-3.5 w-3.5" /> Falar
                  </Button>
                )}
              </div>
              {recording && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  A Axia está a ouvir...
                </div>
              )}
              {transcript && (
                <div className="text-xs bg-background rounded border p-2">
                  <Badge variant="outline" className="mb-1">
                    transcrição
                  </Badge>
                  <p className="italic">{transcript}</p>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Comandos: "repetir", "corrigir", "voltar", "saltar", "continuar", "cancelar".
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t mt-2 sticky bottom-0 bg-background">
          <div className="flex gap-2 justify-between sm:justify-start">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="gap-1">
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
            {stepIdx > 0 && (
              <Button variant="ghost" size="sm" onClick={goBack} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2 sm:justify-end">
            {meta.canSkip && currentStep !== "review" && (
              <Button variant="outline" size="sm" onClick={goSkip} className="gap-1 flex-1 sm:flex-initial">
                <SkipForward className="h-3.5 w-3.5" /> Saltar
              </Button>
            )}
            {currentStep === "review" ? (
              <Button onClick={handleSave} disabled={saving} className="gap-2 flex-1 sm:flex-initial">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Gravar RDO
              </Button>
            ) : (
              <Button onClick={goNext} className="gap-1 flex-1 sm:flex-initial">
                Continuar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({
  icon: Icon,
  label,
  value,
  onEdit,
}: {
  icon: any;
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm whitespace-pre-wrap break-words">{value}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1 h-7">
        <RotateCcw className="h-3 w-3" /> Editar
      </Button>
    </div>
  );
}

export default RDOVoiceWizard;
