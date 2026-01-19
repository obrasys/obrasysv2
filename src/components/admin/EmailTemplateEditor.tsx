import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Eye, Code, Copy, Check } from "lucide-react";
import { EmailTemplate, TEMPLATE_VARIABLES } from "@/types/email-templates";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onBack: () => void;
}

export function EmailTemplateEditor({ template, onBack }: EmailTemplateEditorProps) {
  const { updateTemplate, isUpdating } = useEmailTemplates();
  const [formData, setFormData] = useState({
    nome: template.nome,
    assunto: template.assunto,
    html_content: template.html_content,
    variaveis: template.variaveis,
    ativo: template.ativo,
  });
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("editor");

  useEffect(() => {
    setFormData({
      nome: template.nome,
      assunto: template.assunto,
      html_content: template.html_content,
      variaveis: template.variaveis,
      ativo: template.ativo,
    });
  }, [template]);

  const handleSave = () => {
    updateTemplate({
      id: template.id,
      data: formData,
    });
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      html_content: prev.html_content + variable,
    }));
  };

  // Preview with sample data
  const getPreviewHtml = () => {
    let html = formData.html_content;
    html = html.replace(/\{\{nome\}\}/g, "João Silva");
    html = html.replace(/\{\{email\}\}/g, "joao@exemplo.pt");
    html = html.replace(/\{\{appUrl\}\}/g, "https://obrasysv2.lovable.app");
    html = html.replace(/\{\{signupUrl\}\}/g, "https://obrasysv2.lovable.app/auth");
    html = html.replace(/\{\{logoUrl\}\}/g, "https://rwpgswjvrotshybwevog.supabase.co/storage/v1/object/public/brand-assets/logo.png");
    html = html.replace(/\{\{ano\}\}/g, new Date().getFullYear().toString());
    return html;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{template.nome}</h2>
            <p className="text-sm text-muted-foreground font-mono">{template.slug}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isUpdating}>
          <Save className="h-4 w-4 mr-2" />
          {isUpdating ? "A guardar..." : "Guardar alterações"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Template</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-4 pt-6">
                  <Label htmlFor="ativo">Template Ativo</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assunto">Linha de Assunto</Label>
                <Input
                  id="assunto"
                  value={formData.assunto}
                  onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* HTML Editor with Preview */}
          <Card>
            <CardHeader className="pb-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conteúdo HTML</CardTitle>
                  <TabsList>
                    <TabsTrigger value="editor" className="gap-2">
                      <Code className="h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Pré-visualização
                    </TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="editor" className="mt-0">
                  <Textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder="Escreva o HTML do template aqui..."
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-0">
                  <div className="border rounded-lg overflow-hidden bg-muted/30">
                    <iframe
                      srcDoc={getPreviewHtml()}
                      className="w-full min-h-[500px] bg-white"
                      title="Email Preview"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Variables */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Variáveis Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {Object.entries(TEMPLATE_VARIABLES).map(([variable, { label, description }]) => (
                    <div
                      key={variable}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{label}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyVariable(variable)}
                        >
                          {copiedVar === variable ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono block mb-2">
                        {variable}
                      </code>
                      <p className="text-xs text-muted-foreground">{description}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => insertVariable(variable)}
                      >
                        Inserir no editor
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
