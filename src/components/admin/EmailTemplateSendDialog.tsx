import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function parseEmails(input: string): string[] {
  return input
    .split(/[\n,;\s]+/g)
    .map((e) => e.trim())
    .filter(Boolean);
}

interface EmailTemplateSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubject: string;
  defaultHtml: string;
}

export function EmailTemplateSendDialog({
  open,
  onOpenChange,
  defaultSubject,
  defaultHtml,
}: EmailTemplateSendDialogProps) {
  const { toast } = useToast();
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [isSending, setIsSending] = useState(false);

  const recipients = useMemo(() => parseEmails(recipientsRaw), [recipientsRaw]);

  // keep subject in sync when switching template
  // (but do not overwrite user's edits while dialog is open)
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setSubject(defaultSubject);
      setRecipientsRaw("");
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast({
        title: "Sem destinatários",
        description: "Introduza pelo menos um email.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: {
          to: recipients,
          subject,
          html: defaultHtml,
        },
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: `Foram enviados ${data?.sent ?? recipients.length} email(s).`,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err?.message ?? "Não foi possível enviar o email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Enviar email</DialogTitle>
          <DialogDescription>
            Introduza os destinatários (separados por vírgula, espaço ou nova linha).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">Assunto</Label>
            <Input
              id="broadcast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-to">Destinatários</Label>
            <Textarea
              id="broadcast-to"
              value={recipientsRaw}
              onChange={(e) => setRecipientsRaw(e.target.value)}
              placeholder="ex: cliente1@empresa.pt\ncliente2@empresa.pt"
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Total: <strong>{recipients.length}</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? "A enviar..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
