import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail, Plus } from "lucide-react";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { EmailTemplateCard } from "@/components/admin/EmailTemplateCard";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { EmailTemplatePreview } from "@/components/admin/EmailTemplatePreview";
import { EmailTemplate } from "@/types/email-templates";

export default function TemplatesPage() {
  const { templates, isLoading } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleBack = () => {
    setSelectedTemplate(null);
  };

  if (selectedTemplate) {
    return (
      <AppLayout
        title="Editar Template"
        subtitle={selectedTemplate.nome}
      >
        <EmailTemplateEditor template={selectedTemplate} onBack={handleBack} />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Templates de Email"
      subtitle="Gerir o conteúdo e design dos emails automáticos"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Sem templates</h3>
            <p className="text-sm text-muted-foreground">
              Não existem templates de email configurados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <EmailTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}

      <EmailTemplatePreview
        template={previewTemplate}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </AppLayout>
  );
}
