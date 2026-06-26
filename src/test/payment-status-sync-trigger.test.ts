/**
 * Migration-level test for the `contas_financeiras → receivables / budget_payment_plans`
 * synchronisation trigger.
 *
 * Quando uma conta a receber é marcada como paga em `contas_financeiras`,
 * o trigger `trg_sync_payment_status` propaga o estado para o `budget_payment_plans`
 * e para a tabela `receivables` (estado, valor pago e remanescente).
 *
 * Estes testes não tocam na base de dados — validam que a migração mais recente
 * que define o trigger continua a satisfazer o contrato esperado, evitando
 * regressões silenciosas em refactors futuros.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const NEEDLE = "sync_payment_status_on_conta_update";

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

describe("contas_financeiras → receivables sync trigger", () => {
  const sql = loadLatestMigrationWith(NEEDLE);

  it("defines the sync function as SECURITY DEFINER", () => {
    expect(sql).toMatch(/FUNCTION\s+public\.sync_payment_status_on_conta_update/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path TO 'public'/);
  });

  it("short-circuits when pago does not change", () => {
    expect(sql).toMatch(/NEW\.pago IS NOT DISTINCT FROM OLD\.pago/);
  });

  it("only processes contas with tipo = 'receber' linked to an obra", () => {
    expect(sql).toMatch(/NEW\.obra_id IS NULL/);
    expect(sql).toMatch(/NEW\.tipo\s*!=\s*'receber'/);
  });

  it("updates the matching budget_payment_plan row", () => {
    expect(sql).toMatch(/UPDATE\s+budget_payment_plans/);
    expect(sql).toMatch(/WHERE\s+obra_id\s*=\s*NEW\.obra_id/);
  });

  it("updates receivables with status, paid_amount and remaining_amount", () => {
    expect(sql).toMatch(/UPDATE\s+receivables/);
    expect(sql).toMatch(/status\s*=\s*v_new_status/);
    expect(sql).toMatch(/paid_amount\s*=\s*CASE WHEN NEW\.pago THEN NEW\.valor ELSE 0 END/);
    expect(sql).toMatch(/remaining_amount\s*=\s*CASE WHEN NEW\.pago THEN 0 ELSE NEW\.valor END/);
    expect(sql).toMatch(/source_type\s*=\s*'budget_award'/);
  });

  it("trigger fires AFTER UPDATE OF pago, FOR EACH ROW", () => {
    expect(sql).toMatch(/CREATE TRIGGER\s+trg_sync_payment_status/);
    expect(sql).toMatch(/AFTER UPDATE OF pago ON contas_financeiras/);
    expect(sql).toMatch(/FOR EACH ROW/);
  });
});
