INSERT INTO public.email_templates (slug, nome, assunto, html_content, variaveis, ativo)
VALUES (
  'oferta-founder',
  'Oferta Founder',
  'Convite exclusivo para quem já está a usar o Obra Sys',
  '<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Oferta Founder – ObraSys</title>
  <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f4f6f9; font-family: ''Red Hat Display'', Arial, sans-serif; color: #1a2332; }
    .wrapper { max-width: 620px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #00679d 0%, #004d75 100%); padding: 40px 40px 32px; text-align: center; }
    .header img { height: 44px; margin-bottom: 20px; }
    .header h1 { color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: rgba(255,255,255,0.82); font-size: 14px; margin-top: 6px; }
    .body { padding: 40px; }
    .greeting { font-size: 17px; font-weight: 600; color: #1a2332; margin-bottom: 20px; }
    .body p { font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 16px; }
    .highlight-box { background: linear-gradient(135deg, #e8f4fd 0%, #dbeeff 100%); border-left: 4px solid #00679d; border-radius: 8px; padding: 24px 28px; margin: 28px 0; }
    .highlight-box p { font-size: 14px; font-weight: 600; color: #00679d; margin-bottom: 12px; }
    .highlight-box ul { list-style: none; padding: 0; }
    .highlight-box ul li { font-size: 14px; color: #1a2332; padding: 6px 0; display: flex; align-items: flex-start; gap: 10px; }
    .highlight-box ul li::before { content: "✓"; color: #00679d; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .signature { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .signature p { font-size: 14px; color: #374151; line-height: 1.6; }
    .signature .name { font-size: 16px; font-weight: 700; color: #1a2332; margin-top: 8px; }
    .signature .role { font-size: 13px; color: #6b7280; }
    .signature .whatsapp { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; background: #25d366; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; }
    .footer { background: #1a2332; padding: 24px 40px; text-align: center; }
    .footer p { color: rgba(255,255,255,0.55); font-size: 12px; line-height: 1.6; }
    .footer a { color: rgba(255,255,255,0.7); text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <img src="{{logoUrl}}" alt="ObraSys" />
        <h1>Oferta Founder</h1>
        <p>Uma oportunidade exclusiva para os primeiros utilizadores</p>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Olá {{nome}},</p>

        <p>Tenho acompanhado a sua utilização do ObraSys e queria começar por agradecer por estar a usar a plataforma de forma ativa.</p>

        <p>Neste momento estamos numa fase muito importante: transformar os primeiros utilizadores em <strong>parceiros fundadores</strong> do projeto.</p>

        <p>Por isso estou a abrir <strong>10 vagas</strong> para o <strong>Plano Founder</strong> — exclusivo para quem já está a utilizar o sistema e acredita na digitalização da construção.</p>

        <div class="highlight-box">
          <p>O plano inclui:</p>
          <ul>
            <li>Valor especial <strong>vitalício de €490</strong></li>
            <li>Acesso prioritário à futura <strong>Rede de Fornecedores</strong></li>
            <li><strong>Suporte direto</strong> comigo</li>
            <li><strong>Participação</strong> nas decisões de evolução do produto</li>
          </ul>
        </div>

        <p>O objetivo é simples: crescer junto com um grupo pequeno de construtores que acreditam no projeto desde o início.</p>

        <p>Gostaria muito que fizesse parte deste grupo.</p>

        <p>Se fizer sentido para si, posso explicar os detalhes rapidamente por telefone ou responder por aqui mesmo.</p>

        <p>Obrigado por fazer parte desta fase inicial.</p>

        <!-- Signature -->
        <div class="signature">
          <p>Um abraço,</p>
          <p class="name">Antonio Cavalcanti</p>
          <p class="role">Fundador – ObraSys</p>
          <a href="https://wa.me/351918152116" class="whatsapp">
            📱 WhatsApp 918 152 116
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>© {{ano}} ObraSys · <a href="{{appUrl}}">obrasys.pt</a></p>
        <p style="margin-top:6px;">Recebeu este email porque é utilizador ativo do ObraSys.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '["{{nome}}", "{{logoUrl}}", "{{appUrl}}", "{{ano}}"]'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;