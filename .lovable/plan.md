

## Using the User's Email for Budget Sending

### The Constraint

Email services like Resend only allow sending from **verified domains**. Since only `obrasys.pt` is verified, we cannot set an arbitrary user email as the `from` address — it would be rejected.

### The Solution

We can use the **Reply-To** header with the user's email. This means:
- **From:** `Nome do Utilizador <noreply@obrasys.pt>` (required for deliverability)
- **Reply-To:** `utilizador@email.com` (the user's actual email)

When the client receives the budget and clicks "Reply", the response goes directly to the user's email. The user's name already appears as the sender name.

### Changes

**File:** `supabase/functions/send-orcamento-email/index.ts`
- Add `reply_to: [profile.email || user.email]` to the Resend API call
- Update the email footer to show the user's email as contact

This is a single-line addition to the Resend request body — minimal change, maximum benefit.

