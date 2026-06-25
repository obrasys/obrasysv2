/**
 * Migration-level test for the hardened UPDATE policy on `mce_approvals`.
 *
 * Security finding `mce_approvals_creator_can_override_decisions`:
 * the previous UPDATE policy allowed the MCE map creator
 * (`mce_maps.user_id = auth.uid()`) to overwrite `decision`, `comment`
 * or `signature` fields on approval rows assigned to OTHER approvers,
 * effectively self-approving their own procurement requests.
 *
 * The fix restricts UPDATE to:
 *   - the explicitly assigned approver (`assigned_user_id = auth.uid()`), or
 *   - a super admin (`is_super_admin()`),
 * scoped to the user's organization, and mirrors the same condition in
 * WITH CHECK so rows cannot be re-assigned to bypass the rule.
 *
 * We assert the latest migration that (re)creates the policy enforces
 * this contract and no longer references `mce_maps.user_id = auth.uid()`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const POLICY_NAME = "MCE approvals updatable by assigned user or admin";

function loadLatestMigrationWith(needle: string): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (let i = files.length - 1; i >= 0; i--) {
    const sql = readFileSync(join(MIGRATIONS_DIR, files[i]), "utf8");
    if (sql.includes(needle)) return sql;
  }
  throw new Error(`No migration found containing ${needle}`);
}

describe("mce_approvals UPDATE policy hardening", () => {
  const sql = loadLatestMigrationWith(POLICY_NAME);

  it("drops the previous permissive UPDATE policy before recreating it", () => {
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS "MCE approvals updatable by assigned user or admin" ON public\.mce_approvals/i,
    );
  });

  it("creates the UPDATE policy on mce_approvals", () => {
    expect(sql).toMatch(
      /CREATE POLICY "MCE approvals updatable by assigned user or admin"\s+ON public\.mce_approvals\s+FOR UPDATE/i,
    );
  });

  it("restricts UPDATE to the assigned approver or super admin within the same org", () => {
    // USING clause: org-scoped AND (assigned_user_id = auth.uid() OR is_super_admin())
    expect(sql).toMatch(/organization_id\s*=\s*get_user_org_id\(\)/i);
    expect(sql).toMatch(/assigned_user_id\s*=\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/is_super_admin\(\)/i);
  });

  it("mirrors the same restriction in WITH CHECK to block rewrites that re-assign the row", () => {
    const withCheckMatch = sql.match(/WITH CHECK\s*\(([\s\S]*?)\);/i);
    expect(withCheckMatch, "expected a WITH CHECK clause on the new UPDATE policy").not.toBeNull();
    const clause = withCheckMatch![1];
    expect(clause).toMatch(/organization_id\s*=\s*get_user_org_id\(\)/i);
    expect(clause).toMatch(/assigned_user_id\s*=\s*auth\.uid\(\)/i);
    expect(clause).toMatch(/is_super_admin\(\)/i);
  });

  it("removes the MCE map creator override branch from the UPDATE policy", () => {
    // The vulnerable branch joined mce_maps and granted update to m.user_id = auth.uid().
    // It must no longer appear in this migration.
    expect(sql).not.toMatch(/FROM\s+mce_maps\s+m[\s\S]{0,200}m\.user_id\s*=\s*auth\.uid\(\)/i);
  });
});
