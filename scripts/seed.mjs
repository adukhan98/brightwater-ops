#!/usr/bin/env node
// Builds a fresh demo database for local development.
//
//   npm run seed                      -> data/brightwater.db
//   BRIGHTWATER_DB=/tmp/x.db npm run seed
//
// The generator is seeded, so customers, products, orders, PO numbers and
// quantities come out the same on every run. Timestamps are laid out
// relative to the moment the script runs so the dashboard always has
// recent activity to show.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_PATH = path.join(ROOT, "db", "schema.sql");

// Orders arrive during the trading day.
const DAY_OPENS_UTC_HOUR = 15;
const TRADING_HOURS = 11;
const DAYS_OF_HISTORY = 120;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export function resolveDbPath() {
  return process.env.BRIGHTWATER_DB ?? path.join(ROOT, "data", "brightwater.db");
}

// ---------------------------------------------------------------------------
// Random numbers

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRandom(seed) {
  const next = mulberry32(seed);
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const pick = (list) => list[Math.floor(next() * list.length)];
  const weighted = (items, weightOf) => {
    let total = 0;
    for (const item of items) total += weightOf(item);
    let r = next() * total;
    for (const item of items) {
      r -= weightOf(item);
      if (r < 0) return item;
    }
    return items[items.length - 1];
  };
  return { next, int, pick, weighted };
}

// ---------------------------------------------------------------------------
// Trading days

// Start of the trading day that is `daysBack` days before the one containing `nowMs`.
function tradingDayStart(nowMs, daysBack) {
  const now = new Date(nowMs);
  let opens = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DAY_OPENS_UTC_HOUR);
  if (opens > nowMs) opens -= DAY_MS;
  return opens - daysBack * DAY_MS;
}

// ---------------------------------------------------------------------------
// Reference data

const CUSTOMERS = [
  { name: "Café Lumen", email: "orders@cafelumen.example", discount: 12, prefix: "LUM", weight: 9.5 },
  { name: "Mesa Verde Grocers", email: "purchasing@mesaverdegrocers.example", discount: 8, prefix: null, weight: 10 },
  { name: "Harbor Street Bakery", email: "hello@harborstreetbakery.example", discount: 0, prefix: null, weight: 9 },
  { name: "Tidewater Roasters", email: "buying@tidewaterroasters.example", discount: 5, prefix: "TDW", weight: 7.5 },
  { name: "Juniper & Rye Bakehouse", email: "kitchen@juniperandrye.example", discount: 0, prefix: "JRB", weight: 6 },
  { name: "Northgate Coffee Bar", email: "manager@northgatecoffee.example", discount: 0, prefix: "NGC", weight: 6.5 },
  { name: "Copperleaf Café", email: "orders@copperleafcafe.example", discount: 0, prefix: "CLC", weight: 5.5 },
  { name: "Fernwood Market", email: "receiving@fernwoodmarket.example", discount: 5, prefix: "FWM", weight: 7 },
  { name: "Little Owl Espresso", email: "owl@littleowlespresso.example", discount: 0, prefix: "LOE", weight: 4.5 },
  { name: "Saltbox Kitchen", email: "chef@saltboxkitchen.example", discount: 0, prefix: "SBK", weight: 4 },
  { name: "Riverbend Deli", email: "deli@riverbenddeli.example", discount: 0, prefix: "RBD", weight: 5 },
  { name: "Alder & Ash Café", email: "team@alderandash.example", discount: 0, prefix: "AAC", weight: 5.5 },
  { name: "Morning Tide Bakery", email: "orders@morningtidebakery.example", discount: 0, prefix: "MTB", weight: 4.5 },
  { name: "Pinecrest Grocery Co-op", email: "buyers@pinecrestcoop.example", discount: 0, prefix: "PGC", weight: 5 },
];

// weight: how often the product shows up on an order line
// qty: typical quantity range per line
// discontinuedDaysAgo: last day the product could be ordered
const PRODUCTS = [
  { sku: "ESP-HOUSE-1KG", name: "House Espresso Blend 1kg", cents: 2850, weight: 14, qty: [6, 30] },
  { sku: "ESP-DECAF-1KG", name: "Swiss Water Decaf 1kg", cents: 3100, weight: 4, qty: [2, 8] },
  { sku: "COF-ETHIO-1KG", name: "Single Origin Ethiopia Guji 1kg", cents: 3675, weight: 3, qty: [2, 8] },
  { sku: "COF-COLOMB-1KG", name: "Colombia Huila 1kg", cents: 3320, weight: 3, qty: [2, 10] },
  { sku: "COF-COLDBREW-5KG", name: "Cold Brew Coarse Grind 5kg", cents: 11200, weight: 2, qty: [1, 4] },
  { sku: "MLK-OAT-6X1L", name: "Oat Milk Barista 1L (case of 6)", cents: 3240, weight: 12, qty: [4, 20] },
  { sku: "MLK-ALM-6X1L", name: "Almond Milk Barista 1L (case of 6)", cents: 2970, weight: 5, qty: [2, 10] },
  { sku: "MLK-SOY-6X1L", name: "Soy Milk Barista 1L (case of 6)", cents: 2640, weight: 3, qty: [2, 8] },
  { sku: "MLK-COCO-6X1L", name: "Coconut Milk Barista 1L (case of 6)", cents: 3060, weight: 2, qty: [1, 6] },
  { sku: "SYR-VANILLA-750", name: "Vanilla Syrup 750ml", cents: 980, weight: 9, qty: [4, 24] },
  { sku: "SYR-CARAMEL-750", name: "Caramel Syrup 750ml", cents: 980, weight: 5, qty: [2, 12] },
  { sku: "SYR-HAZEL-750", name: "Hazelnut Syrup 750ml", cents: 980, weight: 4, qty: [2, 12] },
  { sku: "SYR-SIMPLE-1L", name: "Simple Syrup 1L", cents: 720, weight: 3, qty: [2, 12] },
  { sku: "SAU-CHOC-2L", name: "Chocolate Sauce 2L", cents: 1690, weight: 3, qty: [1, 6] },
  { sku: "SYR-PUMPKIN-750", name: "Pumpkin Spice Syrup 750ml", cents: 1050, weight: 3, qty: [2, 12], discontinuedDaysAgo: 40 },
  { sku: "TEA-CHAI-1KG", name: "Chai Concentrate 1kg", cents: 1825, weight: 5, qty: [2, 10] },
  { sku: "TEA-MATCHA-500", name: "Ceremonial Matcha Powder 500g", cents: 4200, weight: 2, qty: [1, 4] },
  { sku: "TEA-EARL-100", name: "Earl Grey Tea Bags (100)", cents: 1150, weight: 3, qty: [1, 6] },
  { sku: "TEA-GREEN-100", name: "Sencha Green Tea Bags (100)", cents: 1240, weight: 2, qty: [1, 6] },
  { sku: "CUP-PAPER-8OZ", name: "Paper Cups 8oz (sleeve of 1000)", cents: 2800, weight: 5, qty: [1, 4] },
  { sku: "CUP-PAPER-12OZ", name: "Paper Cups 12oz (sleeve of 1000)", cents: 3300, weight: 10, qty: [2, 8] },
  { sku: "CUP-PAPER-16OZ", name: "Paper Cups 16oz (sleeve of 1000)", cents: 3850, weight: 4, qty: [1, 4] },
  { sku: "CUP-COLD-16OZ", name: "Clear Cold Cups 16oz (sleeve of 1000)", cents: 4400, weight: 3, qty: [1, 3] },
  { sku: "CUP-FOAM-8OZ", name: "Foam Cups 8oz (sleeve of 1000)", cents: 2100, weight: 3, qty: [1, 4], discontinuedDaysAgo: 95 },
  { sku: "LID-SIP-8OZ", name: "Sip Lids 8oz (sleeve of 100)", cents: 390, weight: 4, qty: [5, 30] },
  { sku: "LID-SIP-12OZ", name: "Sip Lids 12oz (sleeve of 100)", cents: 420, weight: 6, qty: [10, 40] },
  { sku: "LID-SIP-16OZ", name: "Sip Lids 16oz (sleeve of 100)", cents: 460, weight: 3, qty: [5, 20] },
  { sku: "LID-DOME-16OZ", name: "Dome Lids 16oz (sleeve of 100)", cents: 510, weight: 2, qty: [5, 20] },
  { sku: "NAP-KRAFT-500", name: "Kraft Napkins (pack of 500)", cents: 740, weight: 6, qty: [2, 12] },
  { sku: "SLV-KRAFT-1000", name: "Kraft Cup Sleeves (case of 1000)", cents: 3600, weight: 3, qty: [1, 3] },
  { sku: "STR-PAPER-500", name: "Paper Straws (box of 500)", cents: 890, weight: 3, qty: [1, 6] },
  { sku: "STR-PLASTIC-500", name: "Plastic Straws (box of 500)", cents: 560, weight: 3, qty: [1, 6], discontinuedDaysAgo: 105 },
  { sku: "STI-WOOD-1000", name: "Wooden Stir Sticks (box of 1000)", cents: 630, weight: 3, qty: [1, 5] },
  { sku: "BAG-KRAFT-500", name: "Kraft Takeaway Bags (pack of 500)", cents: 2450, weight: 3, qty: [1, 4] },
  { sku: "SUG-RAW-1000", name: "Raw Sugar Sticks (box of 1000)", cents: 1980, weight: 3, qty: [1, 4] },
  { sku: "FLT-PAPER-V60", name: "V60 Paper Filters (100)", cents: 690, weight: 4, qty: [2, 12] },
  { sku: "FLT-BATCH-500", name: "Batch Brew Filters (500)", cents: 1460, weight: 3, qty: [1, 4] },
  { sku: "CLN-TABS-100", name: "Espresso Machine Cleaning Tablets (100)", cents: 2340, weight: 2, qty: [1, 3] },
  { sku: "CLN-DESCALE-1L", name: "Descaler 1L", cents: 1575, weight: 2, qty: [1, 4] },
  { sku: "EQP-PITCHER-600", name: "Steel Milk Pitcher 600ml", cents: 1890, weight: 1, qty: [1, 4] },
  { sku: "EQP-TAMPER-58", name: "Espresso Tamper 58mm", cents: 3900, weight: 0.5, qty: [1, 2] },
  { sku: "EQP-SCALE-01", name: "Barista Scale", cents: 6400, weight: 0.5, qty: [1, 2] },
  { sku: "EQP-KETTLE-GN", name: "Gooseneck Kettle 1L", cents: 7200, weight: 0.5, qty: [1, 2] },
  { sku: "EQP-GRINDER-PRO", name: "Burr Grinder Pro", cents: 125000, weight: 0.15, qty: [1, 1] },
];

// Stock settings for the busiest lines and a few that are waiting on a delivery.
const STOCK_OVERRIDES = {
  "ESP-HOUSE-1KG": { kind: "fast", reorderPoint: 80 },
  "MLK-OAT-6X1L": { kind: "fast", reorderPoint: 60 },
  "CUP-PAPER-12OZ": { kind: "fast", reorderPoint: 40 },
  "SYR-VANILLA-750": { kind: "fast", reorderPoint: 50 },
  "TEA-CHAI-1KG": { kind: "fixed", reorderPoint: 60, onHand: 22 },
  "NAP-KRAFT-500": { kind: "fixed", reorderPoint: 80, onHand: 35 },
  "FLT-PAPER-V60": { kind: "fixed", reorderPoint: 50, onHand: 12 },
};

const NOTES = [
  "Deliver before 9am",
  "Back door, ring bell",
  "Call on arrival",
  "Weekly restock",
  "Leave with front counter",
  "Loading dock closes at 3pm",
  "Rush, running low",
  "Split delivery OK",
  "Ask for Jamie at receiving",
  "Standing order",
  "Please include invoice copy",
  "Gate code 4417",
];

// Café Lumen's weekly restock from last week.
const LUMEN_REFERENCE_ORDER = {
  customer: "Café Lumen",
  po: "LUM-2231",
  daysAgo: 9,
  minuteIntoDay: 3 * 60 + 42,
  status: "delivered",
  notes: "Weekly restock",
  lines: [
    ["ESP-HOUSE-1KG", 24],
    ["MLK-OAT-6X1L", 10],
    ["CUP-PAPER-12OZ", 5],
  ],
};

const NUMERIC_PO_LAST = { "Mesa Verde Grocers": 10896, "Harbor Street Bakery": 10893 };

// ---------------------------------------------------------------------------
// Order planning (no wall-clock time involved here)

// Relative order volume for each hour of the trading day.
const HOURLY_VOLUME = [7, 7.5, 8, 8.5, 7.5, 7, 7.5, 8.5, 9.5, 13.5, 15.5];

function pickMinuteIntoDay(rand) {
  const hours = Array.from({ length: TRADING_HOURS }, (_, h) => h);
  const hour = rand.weighted(hours, (h) => HOURLY_VOLUME[h]);
  return hour * 60 + rand.int(0, 59);
}

function pickStatus(rand, daysAgo) {
  const r = rand.next();
  if (daysAgo <= 3) {
    if (r < 0.48) return "pending";
    if (r < 0.81) return "processing";
    if (r < 0.95) return "shipped";
    return "cancelled";
  }
  if (daysAgo <= 10) {
    if (r < 0.04) return "cancelled";
    const shippedShare = 0.65 - (daysAgo - 4) * 0.09;
    return rand.next() < shippedShare ? "shipped" : "delivered";
  }
  if (r < 0.92) return "delivered";
  if (r < 0.97) return "cancelled";
  return "shipped";
}

function pickLineCount(rand) {
  const r = rand.next();
  if (r < 0.24) return 1;
  if (r < 0.54) return 2;
  if (r < 0.77) return 3;
  if (r < 0.92) return 4;
  return 5;
}

function planOrders(rand) {
  const plans = [];
  for (let daysAgo = DAYS_OF_HISTORY - 1; daysAgo >= 0; daysAgo--) {
    const count = rand.int(38, 62);
    for (let i = 0; i < count; i++) {
      const customer = rand.weighted(CUSTOMERS, (c) => c.weight);
      const minuteIntoDay = pickMinuteIntoDay(rand);
      const second = rand.int(0, 59);
      const millis = rand.int(0, 999);
      const status = pickStatus(rand, daysAgo);
      const shipDelayHours = 4 + rand.next() * 52;
      const deliverFraction = rand.next();
      const source = rand.next() < 0.8 ? "manual" : "import";
      const notes = rand.next() < 0.12 ? rand.pick(NOTES) : null;

      const available = PRODUCTS.filter(
        (p) => p.discontinuedDaysAgo === undefined || daysAgo > p.discontinuedDaysAgo,
      );
      const lineCount = pickLineCount(rand);
      const lines = [];
      const used = new Set();
      while (lines.length < lineCount) {
        const product = rand.weighted(available, (p) => p.weight);
        if (used.has(product.sku)) continue;
        used.add(product.sku);
        lines.push([product.sku, rand.int(product.qty[0], product.qty[1])]);
      }

      plans.push({
        customer: customer.name,
        daysAgo,
        minuteIntoDay,
        second,
        millis,
        status,
        shipDelayHours,
        deliverFraction,
        source,
        notes,
        lines,
        po: null,
      });
    }
  }

  const ref = LUMEN_REFERENCE_ORDER;
  plans.push({
    customer: ref.customer,
    daysAgo: ref.daysAgo,
    minuteIntoDay: ref.minuteIntoDay,
    second: 17,
    millis: 412,
    status: ref.status,
    shipDelayHours: 26.5,
    deliverFraction: 0.5,
    source: "manual",
    notes: ref.notes,
    lines: ref.lines,
    po: ref.po,
  });

  plans.sort(
    (a, b) =>
      b.daysAgo - a.daysAgo ||
      a.minuteIntoDay - b.minuteIntoDay ||
      a.second - b.second ||
      a.millis - b.millis,
  );
  assignPoNumbers(plans, rand);
  return plans;
}

function assignPoNumbers(plans, rand) {
  const step = () => (rand.next() < 0.1 ? rand.int(2, 3) : 1);
  for (const customer of CUSTOMERS) {
    const own = plans.filter((p) => p.customer === customer.name);
    if (customer.prefix === null) {
      let n = NUMERIC_PO_LAST[customer.name];
      for (let i = own.length - 1; i >= 0; i--) {
        own[i].po = String(n);
        n -= step();
      }
      continue;
    }
    const fmt = (n) => `${customer.prefix}-${n}`;
    const anchor = own.findIndex((p) => p.po !== null);
    if (anchor === -1) {
      let n = rand.int(1000, 3400);
      for (const p of own) {
        p.po = fmt(n);
        n += step();
      }
      continue;
    }
    let n = Number(own[anchor].po.split("-")[1]);
    for (let i = anchor + 1; i < own.length; i++) {
      n += step();
      own[i].po = fmt(n);
    }
    n = Number(own[anchor].po.split("-")[1]);
    for (let i = anchor - 1; i >= 0; i--) {
      n -= step();
      own[i].po = fmt(n);
    }
  }
}

// ---------------------------------------------------------------------------
// Timestamps (anchored to "now")

function placeInTime(plan, nowMs) {
  let daysAgo = plan.daysAgo;
  let createdMs;
  for (;;) {
    createdMs =
      tradingDayStart(nowMs, daysAgo) +
      plan.minuteIntoDay * 60_000 +
      plan.second * 1000 +
      plan.millis;
    if (createdMs <= nowMs) break;
    daysAgo += 1;
  }

  let shippedMs = null;
  if (plan.status === "shipped" || plan.status === "delivered") {
    shippedMs = createdMs + Math.round(plan.shipDelayHours * HOUR_MS);
    if (shippedMs > nowMs) {
      shippedMs = createdMs + Math.round((nowMs - createdMs) * (0.2 + 0.7 * plan.deliverFraction));
    }
  }
  return {
    createdAt: new Date(createdMs).toISOString(),
    shippedAt: shippedMs === null ? null : new Date(shippedMs).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Stock levels

function stockLevels(rand, reserved) {
  return PRODUCTS.map((p) => {
    const committed = reserved.get(p.sku) ?? 0;
    const override = STOCK_OVERRIDES[p.sku];
    if (p.discontinuedDaysAgo !== undefined) {
      return { onHand: 0, reorderPoint: rand.int(3, 8) * 10 };
    }
    if (override?.kind === "fixed") {
      return { onHand: override.onHand, reorderPoint: override.reorderPoint };
    }
    if (override?.kind === "fast") {
      const onHand = override.reorderPoint + Math.max(5, Math.round(committed * 0.35));
      return { onHand, reorderPoint: override.reorderPoint };
    }
    const reorderPoint = rand.int(3, 12) * 10;
    const onHand = committed + reorderPoint + rand.int(40, 260);
    return { onHand, reorderPoint };
  });
}

// ---------------------------------------------------------------------------

export function seed({ dbFile = resolveDbPath(), now = new Date() } = {}) {
  const nowMs = now.getTime();
  const rand = makeRandom(20240611);

  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(dbFile + suffix, { force: true });
  }
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });

  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

  const customerIds = new Map();
  const productIds = new Map();
  const productBySku = new Map(PRODUCTS.map((p) => [p.sku, p]));

  const insertCustomer = db.prepare(
    "INSERT INTO customers (name, contact_email, discount_pct) VALUES (?, ?, ?)",
  );
  const insertProduct = db.prepare(
    `INSERT INTO products (sku, name, unit_price_cents, stock_on_hand, reorder_point, discontinued)
     VALUES (?, ?, ?, 0, 0, ?)`,
  );
  db.transaction(() => {
    for (const c of CUSTOMERS) {
      customerIds.set(c.name, Number(insertCustomer.run(c.name, c.email, c.discount).lastInsertRowid));
    }
    for (const p of PRODUCTS) {
      const discontinued = p.discontinuedDaysAgo === undefined ? 0 : 1;
      productIds.set(p.sku, Number(insertProduct.run(p.sku, p.name, p.cents, discontinued).lastInsertRowid));
    }
  })();

  const plans = planOrders(rand);
  const discountByCustomer = new Map(CUSTOMERS.map((c) => [c.name, c.discount]));

  const insertOrder = db.prepare(
    `INSERT INTO orders (customer_id, po_number, status, discount_pct, created_at, shipped_at, source, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
  );

  const reserved = new Map();
  let itemCount = 0;
  db.transaction(() => {
    for (const plan of plans) {
      const { createdAt, shippedAt } = placeInTime(plan, nowMs);
      const orderId = Number(
        insertOrder.run(
          customerIds.get(plan.customer),
          plan.po,
          plan.status,
          discountByCustomer.get(plan.customer),
          createdAt,
          shippedAt,
          plan.source,
          plan.notes,
        ).lastInsertRowid,
      );
      const open = plan.status === "pending" || plan.status === "processing";
      for (const [sku, quantity] of plan.lines) {
        insertItem.run(orderId, productIds.get(sku), quantity, productBySku.get(sku).cents);
        itemCount += 1;
        if (open) reserved.set(sku, (reserved.get(sku) ?? 0) + quantity);
      }
    }
  })();

  const levels = stockLevels(rand, reserved);
  const updateStock = db.prepare(
    "UPDATE products SET stock_on_hand = ?, reorder_point = ? WHERE id = ?",
  );
  db.transaction(() => {
    PRODUCTS.forEach((p, i) => {
      updateStock.run(levels[i].onHand, levels[i].reorderPoint, productIds.get(p.sku));
    });
  })();

  const byStatus = Object.fromEntries(
    db
      .prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY status")
      .all()
      .map((r) => [r.status, r.n]),
  );
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();

  return {
    dbFile,
    customers: CUSTOMERS.length,
    products: PRODUCTS.length,
    orders: plans.length,
    items: itemCount,
    byStatus,
  };
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const started = Date.now();
  const result = seed();
  const statuses = Object.entries(result.byStatus)
    .map(([status, n]) => `${status} ${n}`)
    .join(", ");
  console.log(`Seeded ${path.relative(process.cwd(), result.dbFile) || result.dbFile}`);
  console.log(`  customers: ${result.customers}`);
  console.log(`  products:  ${result.products}`);
  console.log(`  orders:    ${result.orders} (${statuses})`);
  console.log(`  items:     ${result.items}`);
  console.log(`  done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
