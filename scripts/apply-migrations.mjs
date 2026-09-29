#!/usr/bin/env node
// اعمال مایگریشن‌های SQL به ترتیب — جایگزین drizzle-kit push در پروداکشن (لیارا)
// قواعد: pg.Client، هر فایل داخل یک تراکنش، رهگیری در _dobare_schema_migrations
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import pg from "pg";

const MIGRATIONS_TABLE = "_dobare_schema_migrations";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[dobare] apply-migrations: DATABASE_URL is not set.");
  process.exit(1);
}

// نسبت به محل خود اسکریپت حل می‌شود — هم در ریشه‌ی ریپو کار می‌کند هم در .next/standalone
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "db", "migrations");

async function main() {
  let files;
  try {
    files = (await readdir(migrationsDir)).filter(f => f.endsWith(".sql")).sort((a, b) => a.localeCompare(b, "en"));
  } catch (error) {
    console.error(`[dobare] apply-migrations: cannot read ${migrationsDir}: ${error.message}`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.log("[dobare] apply-migrations: no migration files found.");
    return;
  }
  const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 8000 });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    for (const file of files) {
      const applied = await client.query(`SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE id = $1`, [file]);
      if (applied.rowCount > 0) {
        console.log(`[dobare] skip (already applied): ${file}`);
        continue;
      }
      const sql = await readFile(join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (id) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        console.log(`[dobare] applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    console.log("[dobare] apply-migrations: done.");
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error("[dobare] apply-migrations failed:", error.message);
  process.exit(1);
});
