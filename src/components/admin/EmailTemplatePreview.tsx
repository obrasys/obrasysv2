import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmailTemplate } from "@/types/email-templates";

interface EmailTemplatePreviewProps {
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailTemplatePreview({ template, open, onOpenChange }: EmailTemplatePreviewProps) {
  if (!template) return null;

  // Preview with sample data
  const getPreviewHtml = () => {
    let html = template.html_content;
    html = html.replace(/\{\{nome\}\}/g, "João Silva");
    html = html.replace(/\{\{email\}\}/g, "joao@exemplo.pt");
    html = html.replace(/\{\{appUrl\}\}/g, "https://obrasysv2.lovable.app");
    html = html.replace(/\{\{signupUrl\}\}/g, "https://obrasysv2.lovable.app/auth");
    html = html.replace(/\{\{logoUrl\}\}/g, "https://rwpgswjvrotshybwevog.supabase.co/storage/v1/object/public/brand-assets/logo.png");
    html = html.replace(/\{\{ano\}\}/g, new Date().getFullYear().toString());
    return html;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Pré-visualização: {template.nome}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <div className="bg-muted/30 p-4 rounded-lg mb-4">
            <p className="text-sm">
              <strong>Assunto:</strong> {template.assunto}
            </p>
          </div>
          <div className="border rounded-lg overflow-hidden h-[60vh]">
            <iframe
              srcDoc={getPreviewHtml()}
              className="w-full h-full bg-white"
              title="Email Preview"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
