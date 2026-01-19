export interface EmailTemplate {
  id: string;
  slug: string;
  nome: string;
  assunto: string;
  html_content: string;
  variaveis: string[];
  ativo: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateFormData {
  slug: string;
  nome: string;
  assunto: string;
  html_content: string;
  variaveis: string[];
  ativo: boolean;
}

export const TEMPLATE_VARIABLES: Record<string, { label: string; description: string }> = {
  '{{nome}}': { label: 'Nome', description: 'Nome do destinatário' },
  '{{email}}': { label: 'Email', description: 'Email do destinatário' },
  '{{appUrl}}': { label: 'URL da App', description: 'URL base da aplicação' },
  '{{signupUrl}}': { label: 'URL de Registo', description: 'URL da página de registo' },
  '{{logoUrl}}': { label: 'URL do Logo', description: 'URL do logotipo ObraSys' },
  '{{ano}}': { label: 'Ano', description: 'Ano atual' },
};
