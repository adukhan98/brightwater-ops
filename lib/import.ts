import { parseCsvRecords } from "./csv";
import type { Db } from "./db";
import type { ImportError, ImportResult, ImportRow, ParsedImport } from "./types";

export const IMPORT_COLUMNS = [
  "customer",
  "po_number",
  "sku",
  "quantity",
  "unit_price",
  "notes",
] as const;

type Column = (typeof IMPORT_COLUMNS)[number];

export function parseOrdersCsv(text: string): ParsedImport {
  const records = parseCsvRecords(text);
  const errors: ImportError[] = [];
  const rows: ImportRow[] = [];

  const header = (records[0]?.fields ?? []).map((name) => name.trim());
  const missing = IMPORT_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    errors.push({
      line: 1,
      message: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
    });
    return { rows, errors };
  }

  const index = Object.fromEntries(
    IMPORT_COLUMNS.map((column) => [column, header.indexOf(column)]),
  ) as Record<Column, number>;

  for (const record of records.slice(1)) {
    if (record.fields.every((value) => value.trim() === "")) continue;

    const get = (column: Column) => (record.fields[index[column]] ?? "").trim();
    const fail = (message: string) => errors.push({ line: record.line, message });

    const customer = get("customer");
    const poNumber = get("po_number");
    const sku = get("sku");
    if (!customer) {
      fail("customer is missing");
      continue;
    }
    if (!poNumber) {
      fail("po_number is missing");
      continue;
    }
    if (!sku) {
      fail("sku is missing");
      continue;
    }

    const quantity = parseInt(get("quantity"), 10);
    if (Number.isNaN(quantity)) {
      fail("quantity is missing or not a number");
      continue;
    }
    if (quantity <= 0) {
      fail("quantity must be greater than zero");
      continue;
    }

    const unitPriceCents = Math.round(
      parseFloat(get("unit_price").replace("$", "")) * 100,
    );
    if (Number.isNaN(unitPriceCents)) {
      fail("unit_price is missing or not a number");
      continue;
    }
    if (unitPriceCents <= 0) {
      fail("unit_price must be greater than zero");
      continue;
    }

    rows.push({
      line: record.line,
      customer,
      po_number: poNumber,
      sku,
      quantity,
      unit_price_cents: unitPriceCents,
      notes: get("notes"),
    });
  }

  return { rows, errors };
}

export function importOrders(db: Db, rows: ImportRow[], now: Date): ImportResult {
  const errors: ImportError[] = [];
  let ordersCreated = 0;
  let itemsCreated = 0;

  const groups = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const key = JSON.stringify([row.customer, row.po_number]);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const findCustomer = db.prepare(
    "SELECT id, discount_pct FROM customers WHERE name = ?",
  );
  const findProduct = db.prepare("SELECT id FROM products WHERE sku = ?");
  const insertOrder = db.prepare(
    `INSERT INTO orders (customer_id, po_number, status, discount_pct, created_at, source, notes)
     VALUES (?, ?, 'pending', ?, ?, 'import', ?)`,
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
     VALUES (?, ?, ?, ?)`,
  );

  const run = db.transaction(() => {
    for (const lines of groups.values()) {
      const { customer: customerName, po_number: poNumber } = lines[0];

      const customer = findCustomer.get(customerName) as
        | { id: number; discount_pct: number }
        | undefined;
      if (!customer) {
        for (const line of lines) {
          errors.push({ line: line.line, message: `Unknown customer "${customerName}"` });
        }
        continue;
      }

      const items: { productId: number; row: ImportRow }[] = [];
      for (const line of lines) {
        const product = findProduct.get(line.sku) as { id: number } | undefined;
        if (!product) {
          errors.push({ line: line.line, message: `Unknown SKU "${line.sku}"` });
          continue;
        }
        items.push({ productId: product.id, row: line });
      }
      if (items.length === 0) continue;

      const notes = lines.find((line) => line.notes !== "")?.notes ?? null;
      const orderId = Number(
        insertOrder.run(
          customer.id,
          poNumber,
          customer.discount_pct,
          now.toISOString(),
          notes,
        ).lastInsertRowid,
      );
      for (const { productId, row } of items) {
        insertItem.run(orderId, productId, row.quantity, row.unit_price_cents);
      }

      ordersCreated += 1;
      itemsCreated += items.length;
    }
  });
  run();

  return { ordersCreated, itemsCreated, errors };
}
