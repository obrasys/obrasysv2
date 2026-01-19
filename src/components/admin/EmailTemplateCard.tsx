import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Edit, Eye, Code } from "lucide-react";
import { EmailTemplate } from "@/types/email-templates";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface EmailTemplateCardProps {
  template: EmailTemplate;
  onEdit: (template: EmailTemplate) => void;
  onPreview: (template: EmailTemplate) => void;
}

export function EmailTemplateCard({ template, onEdit, onPreview }: EmailTemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{template.nome}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">
                {template.slug}
              </p>
            </div>
          </div>
          <Badge variant={template.ativo ? "default" : "secondary"}>
            {template.ativo ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Assunto</p>
            <p className="text-sm mt-1">{template.assunto}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-muted-foreground">Variáveis:</p>
            {template.variaveis.map((v) => (
              <Badge key={v} variant="outline" className="font-mono text-xs">
                {v}
              </Badge>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            Última atualização:{" "}
            {format(new Date(template.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onPreview(template)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualizar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onEdit(template)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
