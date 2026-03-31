UPDATE email_templates SET html_content = '<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atualizações ObraSys</title>
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
                Novidades ObraSys 🚀
              </h1>
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0;">Março 2026</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1e293b; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">
                Olá, {{nome}}
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                Lançámos várias melhorias importantes esta semana. Confira tudo o que há de novo:
              </p>
              
              <!-- Portal do Cliente -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 16px; border-radius: 0 8px 8px 0;">
                <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px;">🏗️ Portal do Cliente Redesenhado</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>• Nova interface completa</strong> — visual mais moderno e intuitivo para os seus clientes<br>
                  <strong>• Plano de pagamentos</strong> — os clientes podem agora ver as parcelas, datas e estados diretamente no portal<br>
                  <strong>• Alertas de pagamentos</strong> — notificações automáticas de parcelas por vencer<br>
                  <strong>• Valor adjudicado visível</strong> — transparência total no portal de faturas<br>
                  <strong>• Fotos nos RDOs</strong> — galeria de fotos dos relatórios diários acessível ao cliente
                </p>
              </div>

              <!-- Painel Admin -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 16px; border-radius: 0 8px 8px 0;">
                <h3 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 8px;">⚙️ Painel de Administração</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>• Novo layout com sidebar</strong> — navegação mais organizada e eficiente<br>
                  <strong>• Financeiro Global redesenhado</strong> — visão consolidada de todas as obras<br>
                  <strong>• Sistema de email marketing</strong> — envio de templates segmentados diretamente do painel<br>
                  <strong>• Campanha de win-back</strong> — fluxo automático para recuperar utilizadores com trial expirado
                </p>
              </div>

              <!-- Livro de Ponto -->
              <div style="background-color: #faf5ff; border-left: 4px solid #a855f7; padding: 16px; margin-bottom: 16px; border-radius: 0 8px 8px 0;">
                <h3 style="color: #6b21a8; font-size: 16px; font-weight: 600; margin: 0 0 8px;">⏱️ Livro de Ponto</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>• Horas extra</strong> — novo campo para registar horas extraordinárias com cálculo automático
                </p>
              </div>

              <!-- Correções -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px; border-radius: 0 8px 8px 0;">
                <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px;">🔧 Correções e Melhorias</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>• Axia Chat</strong> — corrigidos erros nas respostas do assistente IA<br>
                  <strong>• Performance</strong> — carregamento mais rápido com code splitting por rotas<br>
                  <strong>• Segurança do portal</strong> — corrigida escalação de privilégios nas permissões de cliente<br>
                  <strong>• Mobile</strong> — corrigido overflow no portal em dispositivos móveis<br>
                  <strong>• Palavras-passe</strong> — corrigida falha na atualização de password
                </p>
              </div>

              <!-- Subscrições -->
              <div style="background-color: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
                <h3 style="color: #0f766e; font-size: 16px; font-weight: 600; margin: 0 0 8px;">💳 Planos e Pagamentos</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>• Novos planos Starter e Professional</strong> — escolha o plano ideal para o seu negócio<br>
                  <strong>• Cupão TRIAL30</strong> — utilize o código para obter desconto no primeiro mês<br>
                  <strong>• Sincronização automática</strong> — estado de pagamento atualizado em tempo real
                </p>
              </div>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{appUrl}}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #00679d 0%, #0088cc 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 16px rgba(0, 103, 157, 0.35);">
                      Experimentar Agora
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
</html>', updated_at = now() WHERE slug = 'atualizacoes';