import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, FileText, FileStack } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnviarOrcamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamentoId: string;
  orcamentoTitulo: string;
  clienteEmail?: string | null;
  clienteNome?: string | null;
}

export function EnviarOrcamentoDialog({
  open,
  onOpenChange,
  orcamentoId,
  orcamentoTitulo,
  clienteEmail,
  clienteNome,
}: EnviarOrcamentoDialogProps) {
  const [email, setEmail] = useState(clienteEmail || '');
  const [mensagem, setMensagem] = useState(
    `Caro(a) ${clienteNome || 'Cliente'},\n\nSegue em anexo o orçamento "${orcamentoTitulo}" para a sua apreciação.\n\nAguardamos o seu feedback.\n\nCom os melhores cumprimentos`
  );
  const [formato, setFormato] = useState<'tecnico' | 'comercial'>('tecnico');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!email.trim()) {
      toast({ title: 'Email obrigatório', description: 'Introduza o email do cliente.', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: 'Email inválido', description: 'Introduza um email válido.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-orcamento-email', {
        body: {
          orcamento_id: orcamentoId,
          email: email.trim(),
          mensagem: mensagem.trim(),
          formato,
        },
      });

      if (error) throw error;

      // Update orcamento status to 'enviado'
      await supabase
        .from('orcamentos')
        .update({ status: 'enviado', data_envio: new Date().toISOString() })
        .eq('id', orcamentoId);

      toast({ title: 'Orçamento enviado', description: `Email enviado para ${email.trim()} (formato ${formato === 'tecnico' ? 'técnico' : 'comercial'})` });
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao enviar orçamento:', err);
      toast({
        title: 'Erro ao enviar',
        description: err.message || 'Não foi possível enviar o orçamento.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Orçamento
          </DialogTitle>
          <DialogDescription>
            Envie o orçamento diretamente para o email do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format selector */}
          <div className="space-y-2">
            <Label>Formato do documento</Label>
            <RadioGroup value={formato} onValueChange={(v) => setFormato(v as 'tecnico' | 'comercial')} className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-all ${formato === 'tecnico' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
              >
                <RadioGroupItem value="tecnico" id="fmt-tecnico" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <FileStack className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium">Técnico</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Capítulos, artigos, quantidades e preços</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-all ${formato === 'comercial' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
              >
                <RadioGroupItem value="comercial" id="fmt-comercial" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium">Comercial</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Resumo narrativo, sem detalhe técnico</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-cliente">Email do cliente *</Label>
            <Input
              id="email-cliente"
              type="email"
              placeholder="cliente@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem</Label>
            <Textarea
              id="mensagem"
              rows={5}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
