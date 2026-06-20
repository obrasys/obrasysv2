/**
 * Migration-level test for the role synchronization trigger.
 *
 * The trigger `trg_sync_profile_role_from_org_member` is fired AFTER INSERT
 * OR UPDATE OF role on `organization_members` and keeps `profiles.role`
 * in lockstep with the active organization role of each user.
 *
 * We cannot easily exercise the trigger end-to-end from the browser anon
 * client (it requires service-role privileges to insert into both tables
 * for arbitrary users), so we assert the migration installs the function,
 * trigger, backfill, and that the privilege-escalation guard was updated
 * to allow system-driven role sync.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function loadMigrationWith(needle: string): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    if (sql.includes(needle)) return sql;
  }
  throw new Error(`No migration found containing ${needle}`);
}

describe("Role synchronization trigger", () => {
  const sql = loadMigrationWith("sync_profile_role_from_org_member");

  it("declares the sync function as SECURITY DEFINER with locked search_path", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.sync_profile_role_from_org_member/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = public/);
  });

  it("only writes to profiles when the role actually changes", () => {
    expect(sql).toMatch(/UPDATE public\.profiles[\s\S]*SET role = NEW\.role/);
    expect(sql).toMatch(/role IS DISTINCT FROM NEW\.role/);
  });

  it("installs an AFTER INSERT OR UPDATE OF role trigger on organization_members", () => {
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS trg_sync_profile_role_from_org_member ON public\.organization_members/);
    expect(sql).toMatch(
      /CREATE TRIGGER trg_sync_profile_role_from_org_member\s+AFTER INSERT OR UPDATE OF role ON public\.organization_members/,
    );
    expect(sql).toMatch(/EXECUTE FUNCTION public\.sync_profile_role_from_org_member/);
  });

  it("backfills existing profiles from their active organization membership", () => {
    expect(sql).toMatch(
      /UPDATE public\.profiles p[\s\S]*FROM public\.organization_members om[\s\S]*om\.member_status\s*=\s*'active'[\s\S]*p\.role IS DISTINCT FROM om\.role/,
    );
  });

  it("loosens prevent_profile_role_self_update so system triggers can sync roles", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.prevent_profile_role_self_update/);
    // The guard must only fire when an authenticated user changes their own role.
    expect(sql).toMatch(/auth\.uid\(\) IS NOT NULL/);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*NEW\.user_id/);
    expect(sql).toMatch(/NOT public\.is_super_admin\(\)/);
  });
});
