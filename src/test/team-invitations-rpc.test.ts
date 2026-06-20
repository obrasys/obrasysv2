/**
 * Smoke test for the team invitations acceptance flow.
 *
 * Verifies:
 *  - The RPC `accept_my_pending_invitations` exists, is callable by anon,
 *    and returns 0 when there is no authenticated user (auth.uid() IS NULL).
 *  - The migration that creates the RPC + role-sync trigger is present
 *    in the repo and contains the expected SQL building blocks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function loadMigrationWith(needle: string): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    if (sql.includes(needle)) return sql;
  }
  throw new Error(`No migration found containing ${needle}`);
}

describe("Pending invitations flow", () => {
  it("the accept_my_pending_invitations RPC is callable by anon and returns 0 without an authenticated user", async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("Skipping live RPC test: missing VITE_SUPABASE_* env vars");
      return;
    }

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await (anon.rpc as any)(
      "accept_my_pending_invitations",
    );

    expect(error).toBeNull();
    // Function returns integer count; with no auth context it must short-circuit to 0.
    expect(Number(data)).toBe(0);
  });

  it("migration defines accept_my_pending_invitations as SECURITY DEFINER and grants EXECUTE to authenticated", () => {
    const sql = loadMigrationWith("accept_my_pending_invitations");

    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.accept_my_pending_invitations/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = public/);
    // Must scope to caller's auth.uid()
    expect(sql).toMatch(/auth\.uid\(\)/);
    // Only flips pending → accepted (never the other way around)
    expect(sql).toMatch(/status\s*=\s*'accepted'/);
    expect(sql).toMatch(/status\s*=\s*'pending'/);
    // Grants
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.accept_my_pending_invitations\(\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.accept_my_pending_invitations\(\) TO authenticated/);
  });

  it("edge function no longer auto-accepts invitations on user creation", () => {
    const path = join(
      process.cwd(),
      "supabase",
      "functions",
      "admin-user-actions",
      "index.ts",
    );
    const src = readFileSync(path, "utf8");
    // markInvitationAccepted must NOT be called inside the create_user flow.
    // It may still be defined as a helper for other actions (e.g. send_password_reset).
    const createUserSection = src.split('action === "create_user"')[1] ?? "";
    const passwordResetIndex = createUserSection.indexOf('action === "send_password_reset"');
    const scope = passwordResetIndex >= 0
      ? createUserSection.slice(0, passwordResetIndex)
      : createUserSection;
    expect(scope.includes("markInvitationAccepted(")).toBe(false);
  });
});
