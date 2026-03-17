

## Security Fix: Enable RLS on `parametric_rules`

**Problem**: The `parametric_rules` table has 24 records publicly exposed with no RLS. It contains system rules (`is_system = true`, `user_id = null`) and potentially user-created custom rules.

**Solution**: Enable RLS with two SELECT policies:
1. Authenticated users can read all system rules (`is_system = true`)
2. Users can read their own custom rules (`user_id = auth.uid()`)

Also add INSERT/UPDATE/DELETE policies for user-owned rules only.

### Database Migration

```sql
ALTER TABLE public.parametric_rules ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read system rules + their own
CREATE POLICY "Users can read system and own rules"
  ON public.parametric_rules
  FOR SELECT
  TO authenticated
  USING (is_system = true OR user_id = auth.uid());

-- Users can insert their own rules
CREATE POLICY "Users can insert own rules"
  ON public.parametric_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_system = false);

-- Users can update their own non-system rules
CREATE POLICY "Users can update own rules"
  ON public.parametric_rules
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = false);

-- Users can delete their own non-system rules
CREATE POLICY "Users can delete own rules"
  ON public.parametric_rules
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = false);
```

No frontend changes needed — existing queries already run as authenticated users.

