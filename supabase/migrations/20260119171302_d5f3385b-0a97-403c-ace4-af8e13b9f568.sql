-- Tabela para gerir templates de email
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  assunto TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variaveis JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca rápida por slug
CREATE INDEX idx_email_templates_slug ON public.email_templates(slug);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Super Admins podem gerir templates (usando a função existente is_super_admin sem parâmetros)
CREATE POLICY "Super admins can manage email templates"
ON public.email_templates
FOR ALL
USING (public.is_super_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates iniciais (welcome e migration)
INSERT INTO public.email_templates (slug, nome, assunto, html_content, variaveis) VALUES
(
  'welcome',
  'Email de Boas-vindas',
  '🎉 Bem-vindo(a) à ObraSys!',
  '<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo à ObraSys</title>
  <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: ''Red Hat Display'', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #00679d 0%, #004d75 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <img src="{{logoUrl}}" alt="ObraSys" style="height: 48px; width: auto; margin-bottom: 16px;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                Bem-vindo(a) à ObraSys!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1e293b; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">
                Olá <strong>{{nome}}</strong>,
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                A sua conta foi criada com sucesso! Estamos entusiasmados por tê-lo(a) connosco.
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
                A ObraSys é a plataforma completa para gestão de obras, orçamentos, fornecedores e muito mais.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{appUrl}}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #00679d 0%, #0088cc 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 16px rgba(0, 103, 157, 0.35);">
                      Aceder ao Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                © {{ano}} ObraSys. Todos os direitos reservados.<br>
                <a href="{{appUrl}}" style="color: #00679d; text-decoration: none;">obrasys.pt</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["{{nome}}", "{{appUrl}}", "{{logoUrl}}", "{{ano}}"]'::jsonb
),
(
  'migration',
  'Email de Migração V1 → V2',
  '🚀 ObraSys 2.0 - Crie a sua palavra-passe',
  '<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ObraSys 2.0 - Migração</title>
  <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: ''Red Hat Display'', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #00679d 0%, #004d75 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <img src="{{logoUrl}}" alt="ObraSys" style="height: 48px; width: auto; margin-bottom: 16px;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                ObraSys 2.0 está aqui!
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 12px 0 0; font-weight: 500;">
                Uma nova era na gestão de obras
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1e293b; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">
                Olá <strong>{{nome}}</strong>,
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                Temos o prazer de anunciar que o <strong>ObraSys 2.0</strong> já está disponível! Reconstruímos a plataforma do zero para oferecer uma experiência ainda melhor.
              </p>
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #00679d; padding: 20px; border-radius: 0 10px 10px 0; margin: 24px 0;">
                <p style="color: #0c4a6e; font-size: 15px; line-height: 1.6; margin: 0;">
                  <strong>🎯 O que há de novo:</strong><br>
                  • Interface moderna e intuitiva<br>
                  • Novos módulos de gestão<br>
                  • Relatórios avançados<br>
                  • Melhor performance
                </p>
              </div>
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
                Para começar a usar, basta criar uma conta com o mesmo email que usava anteriormente.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{signupUrl}}" style="display: inline-block; background: linear-gradient(135deg, #00679d 0%, #0088cc 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 16px rgba(0, 103, 157, 0.35);">
                      Criar Conta
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #94a3b8; font-size: 14px; text-align: center; margin: 28px 0 0;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="{{signupUrl}}" style="color: #00679d; text-decoration: underline;">{{signupUrl}}</a>
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; margin: 28px 0 0;">
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                  <strong>💡 Dica:</strong> Use o mesmo email que usava no ObraSys 1.0 para manter a continuidade.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                © {{ano}} ObraSys. Todos os direitos reservados.<br>
                <a href="{{appUrl}}" style="color: #00679d; text-decoration: none;">obrasys.pt</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["{{nome}}", "{{signupUrl}}", "{{appUrl}}", "{{logoUrl}}", "{{ano}}"]'::jsonb
);