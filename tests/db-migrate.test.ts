// The app applies its own additive migrations at startup (src/lib/db/
// migrate.ts; the Chute brains refactor plan, slice 3's Migration line, and
// CLAUDE.md's ship pattern as amended 2026-10-05). Pinned here: every listed
// migration has its file under prisma/migrations and the file carries the
// same statement; every statement is an idempotent column add; a column that
// exists costs one SELECT and no ALTER; a missing one is added; a database
// the server cannot reach is reported, never thrown.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import {
  ADDITIVE,
  applyAdditive,
  type ColumnMigration,
  type RawClient,
} from "../src/lib/db/migrate";

function fileStatement(migration: string): string {
  const text = readFileSync(
    join(cwd(), "prisma", "migrations", migration, "migration.sql"),
    "utf8",
  );
  return text
    .split("\n")
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("--"))
    .join("\n")
    .trim();
}

function fake(present: boolean, fail?: Error) {
  const calls: { query: string[]; execute: string[] } = { query: [], execute: [] };
  const db: RawClient = {
    async $queryRawUnsafe<T>(query: string) {
      calls.query.push(query);
      if (fail) throw fail;
      return (present ? [{ n: 1 }] : []) as T;
    },
    async $executeRawUnsafe(query: string) {
      calls.execute.push(query);
      return 0;
    },
  };
  return { db, calls };
}

const ONE: ColumnMigration = {
  migration: "20261005120000_account_note_door",
  table: "AccountNote",
  column: "door",
  sql: `ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "door" TEXT NOT NULL DEFAULT '';`,
};

describe("the additive list and its files agree", () => {
  test("every listed migration has its file, carrying the same statement", () => {
    assert.ok(ADDITIVE.length > 0);
    for (const m of ADDITIVE) {
      assert.equal(fileStatement(m.migration), m.sql.trim(), m.migration);
    }
  });

  test("every statement is an idempotent add of the column it names", () => {
    for (const m of ADDITIVE) {
      const head = `ALTER TABLE "${m.table}" ADD COLUMN IF NOT EXISTS "${m.column}" `;
      assert.ok(m.sql.startsWith(head), `${m.migration}: ${m.sql}`);
      assert.equal(m.sql.split(";").filter((s) => s.trim()).length, 1, "one statement");
    }
  });
});

describe("applyAdditive", () => {
  test("a column that exists costs one SELECT and no ALTER", async () => {
    const { db, calls } = fake(true);
    const report = await applyAdditive(db, [ONE]);
    assert.deepEqual(report, { applied: [], present: [ONE.migration], failed: [] });
    assert.equal(calls.query.length, 1);
    assert.deepEqual(calls.execute, []);
  });

  test("a missing column is added with the file's statement", async () => {
    const { db, calls } = fake(false);
    const report = await applyAdditive(db, [ONE]);
    assert.deepEqual(report, { applied: [ONE.migration], present: [], failed: [] });
    assert.deepEqual(calls.execute, [ONE.sql.replace(/;$/, "")]);
  });

  test("a database the server cannot reach is reported, never thrown", async () => {
    const { db, calls } = fake(false, new Error("P1001: Can't reach database server"));
    const report = await applyAdditive(db, [ONE]);
    assert.deepEqual(report.applied, []);
    assert.deepEqual(report.present, []);
    assert.equal(report.failed.length, 1);
    assert.equal(report.failed[0]?.migration, ONE.migration);
    assert.match(report.failed[0]?.error ?? "", /P1001/);
    assert.deepEqual(calls.execute, []);
  });
});
