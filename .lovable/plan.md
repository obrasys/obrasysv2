
## Create "Oferta Founder" Email Template

### Goal
Insert a new email template called **"Oferta Founder"** into the database, matching the visual style already used by all existing templates (branded ObraSys HTML with the blue gradient header, logo, card layout, and footer).

### What will be created
A single database migration that inserts the new template record into `public.email_templates` with:

| Field | Value |
|---|---|
| `slug` | `oferta-founder` |
| `nome` | `Oferta Founder` |
| `assunto` | `Convite exclusivo para quem já está a usar o Obra Sys` |
| `variaveis` | `{{nome}}`, `{{logoUrl}}`, `{{appUrl}}`, `{{ano}}` |
| `ativo` | `true` |
| `html_content` | Full branded HTML (see below) |

### HTML Content Design
The email will follow the exact same visual pattern as the existing templates (Red Hat Display font, blue gradient header `#00679d → #004d75`, white card body, blue footer). The content is a personal, warm invitation from the founder:

- **Header**: ObraSys logo + gradient band, title "Oferta Founder"
- **Body**:
  - Personal greeting with `{{nome}}`
  - 4 paragraphs of the founder's message (verbatim from user)
  - A styled blue highlight box listing the 4 plan benefits (€490 vitalício, Rede de Fornecedores, suporte direto, participação no produto)
  - Closing with Antonio Cavalcanti's signature block and WhatsApp number
- **Footer**: Standard `© {{ano}} ObraSys` footer with link to `{{appUrl}}`

### Variables Used
Only variables already registered in `TEMPLATE_VARIABLES` are used:
- `{{nome}}` — recipient's name
- `{{logoUrl}}` — ObraSys logo
- `{{appUrl}}` — app URL
- `{{ano}}` — current year

No code changes are needed — the template will appear automatically in the Admin → Templates page once inserted, where it can be previewed, edited, and sent.

### Technical Notes
- The migration uses `INSERT ... ON CONFLICT (slug) DO NOTHING` to be safe on re-runs.
- No RLS changes needed — the `email_templates` table already has the correct policies (super admin access only for write, no public exposure).
- No frontend file changes are required — the existing `EmailTemplateCard`, `EmailTemplateEditor`, and `EmailTemplateSendDialog` components will handle the new template automatically.
