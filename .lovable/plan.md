
# Autenticação em Dois Fatores (2FA) por Email

Implementação de 2FA **obrigatório** para todos os utilizadores, com envio de código OTP de 6 dígitos por email (via Resend já configurado) e opção "lembrar este dispositivo por 30 dias".

## Abordagem

Em vez do MFA nativo do Supabase (TOTP/app autenticadora), implementamos uma camada própria de OTP por email — mais simples para o utilizador final e reutiliza o pipeline Resend já existente.

O fluxo bloqueia o acesso à app **após** o login com password ser bem sucedido, até o utilizador validar o código enviado para o seu email.

## Fluxo de utilizador

```text
1. Login (email + password)  ✓ OK
2. Sistema verifica:
   - dispositivo confiável válido?  →  entra direto
   - caso contrário:
3. Gera código de 6 dígitos, envia por email, mostra ecrã "Introduzir código"
4. Utilizador insere código + opcional ☑ "Confiar neste dispositivo (30 dias)"
5. Validação OK → acesso liberado + (se marcado) emite trusted-device token
6. Reentradas no mesmo dispositivo dentro de 30 dias saltam o passo 3-5
```

## Base de Dados (migration)

- **`user_mfa_settings`** — `user_id` (PK), `enabled` (bool, default true para todos), `enrolled_at`
- **`mfa_otp_codes`** — `id`, `user_id`, `code_hash` (sha256), `expires_at` (5 min), `attempts` (max 5), `consumed_at`, `created_at`, `ip_address`
- **`mfa_trusted_devices`** — `id`, `user_id`, `device_token_hash`, `device_label` (user-agent resumido), `expires_at` (30 dias), `last_used_at`, `created_at`
- RLS estrita: cada utilizador só vê os seus próprios registos
- Trigger `handle_new_user`: ao criar perfil, criar linha em `user_mfa_settings` com `enabled = true`
- Função `cleanup_expired_otp_codes()` (apagar códigos > 1h e dispositivos expirados)

## Edge Functions

- **`send-2fa-code`** (verify_jwt = true)
  - Gera código 6 dígitos, guarda hash em `mfa_otp_codes`, expira em 5 min
  - Rate-limit: máx 3 envios / 10 min por user_id
  - Envia email branded via Resend (assinado por António Cavalcanti, mantendo standard do projeto)
  - Reutiliza padrão de `send-orcamento-email`

- **`verify-2fa-code`** (verify_jwt = true)
  - Recebe `{ code, trustDevice }`
  - Valida hash + expiração + tentativas
  - Marca `consumed_at`
  - Se `trustDevice`: gera token aleatório (32 bytes), guarda hash em `mfa_trusted_devices`, retorna token plain para o cliente
  - Retorna `{ verified: true, deviceToken?: string }`

## Frontend

- **`src/contexts/AuthContext.tsx`**: adiciona estado `mfaVerified: boolean` e função `verifyMFA`. Considera dispositivo confiável lendo token em `localStorage` (`obrasys_trusted_device`) e validando contra a tabela via RPC `is_trusted_device(device_token)`.
- **Novo `src/pages/Verify2FA.tsx`**: ecrã com `InputOTP` de 6 dígitos, botão "Reenviar código" (cooldown 60s), checkbox "Confiar neste dispositivo 30 dias", link "Sair".
- **`src/components/layout/AppLayout.tsx`**: se `user && !mfaVerified` → redireciona para `/verify-2fa` (gate global).
- **`src/App.tsx`**: regista rota pública `/verify-2fa`.
- **`src/pages/Auth.tsx` e `src/pages/fornecedor/Auth.tsx`**: após `signIn` ok, em vez de ir direto ao dashboard, dispara `send-2fa-code` e navega para `/verify-2fa`.
- **`src/pages/Perfil.tsx`** (secção Segurança): mostra estado MFA (sempre ativo), lista de dispositivos confiáveis com botão "Revogar".

## Segurança

- Códigos guardados como **hash SHA-256** (nunca em plaintext)
- Tokens de dispositivo: 32 bytes aleatórios, guardados em hash, transmitidos por HTTPS only
- Rate-limit no edge function (3 envios / 10 min, 5 tentativas de validação por código)
- Códigos expiram em **5 min**; dispositivos em **30 dias**
- Logs de eventos em `audit_logs` (envio, sucesso, falha, dispositivo revogado)

## Notas

- O Resend já está configurado e funcional no projeto (`send-orcamento-email`), portanto **não é necessário** configurar domínio Lovable Emails. Reutilizamos o mesmo `RESEND_API_KEY` e remetente `noreply@obrasys.pt`.
- Como é **obrigatório**, utilizadores existentes serão forçados a verificar no próximo login — o ecrã `/verify-2fa` é o gate global, não há opt-out.
- Super Admins seguem a mesma regra (sem exceção).
