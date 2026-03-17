

## Security Fix: Enable RLS on `orcamento_templates_essencial`

**Problem**: The `orcamento_templates_essencial` table has no RLS enabled, making it publicly accessible. While it contains no sensitive user data (only pre-built budget templates), it should still be protected.

**Solution**: Enable RLS and add a SELECT policy allowing authenticated users to read all rows. No INSERT/UPDATE/DELETE policies needed since this is a system-managed templates table.

### Database Migration

```sql
-- Enable RLS
ALTER TABLE public.orcamento_templates_essencial ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read templates
CREATE POLICY "Authenticated users can read templates"
  ON public.orcamento_templates_essencial
  FOR SELECT
  TO authenticated
  USING (true);
```

No frontend code changes needed — the existing queries already run as authenticated users.

