#!/usr/bin/env node
// Runs before `npm run dev` / `npm start`: creates the demo database on first
// run and leaves an existing one alone.

import fs from "node:fs";
import path from "node:path";
import { resolveDbPath, seed } from "./seed.mjs";

const dbFile = resolveDbPath();

if (!fs.existsSync(dbFile)) {
  const result = seed({ dbFile });
  const relative = path.relative(process.cwd(), dbFile);
  const shown = relative && !relative.startsWith("..") ? relative : dbFile;
  console.log(
    `No database at ${shown}; created demo data (${result.orders} orders, ${result.products} products).`,
  );
}
