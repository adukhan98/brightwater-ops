import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

export function dbPath(): string {
  return (
    process.env.BRIGHTWATER_DB ??
    path.join(process.cwd(), "data", "brightwater.db")
  );
}

export function createSchema(db: Db): void {
  db.exec(fs.readFileSync(/* turbopackIgnore: true */ SCHEMA_PATH, "utf8"));
}

export function openDb(file: string): Db {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

const globalForDb = globalThis as unknown as { __brightwaterDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__brightwaterDb) {
    const file = dbPath();
    if (!fs.existsSync(/* turbopackIgnore: true */ file)) {
      throw new Error(
        `Database not found at ${file}. Run "npm run seed" to create it.`,
      );
    }
    globalForDb.__brightwaterDb = openDb(file);
  }
  return globalForDb.__brightwaterDb;
}
