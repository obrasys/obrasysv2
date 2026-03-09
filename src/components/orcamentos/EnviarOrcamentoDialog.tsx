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
import { Loader2, Send } from 'lucide-react';
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
        },
      });

      if (error) throw error;

      // Update orcamento status to 'enviado'
      await supabase
        .from('orcamentos')
        .update({ status: 'enviado', data_envio: new Date().toISOString() })
        .eq('id', orcamentoId);

      toast({ title: 'Orçamento enviado', description: `Email enviado para ${email.trim()}` });
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
              rows={6}
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
