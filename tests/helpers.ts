import Database from "better-sqlite3";
import { createSchema, type Db } from "@/lib/db";
import type { OrderSource, OrderStatus } from "@/lib/types";

export function makeTestDb(): Db {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  createSchema(db);
  return db;
}

export function insertCustomer(
  db: Db,
  values: { name: string; discount_pct?: number; contact_email?: string },
): number {
  const result = db
    .prepare(
      "INSERT INTO customers (name, contact_email, discount_pct) VALUES (?, ?, ?)",
    )
    .run(
      values.name,
      values.contact_email ?? "orders@example.com",
      values.discount_pct ?? 0,
    );
  return Number(result.lastInsertRowid);
}

export function insertProduct(
  db: Db,
  values: {
    sku: string;
    name?: string;
    unit_price_cents?: number;
    stock_on_hand?: number;
    reorder_point?: number;
    discontinued?: boolean;
  },
): number {
  const result = db
    .prepare(
      `INSERT INTO products (sku, name, unit_price_cents, stock_on_hand, reorder_point, discontinued)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      values.sku,
      values.name ?? values.sku,
      values.unit_price_cents ?? 1000,
      values.stock_on_hand ?? 100,
      values.reorder_point ?? 10,
      values.discontinued ? 1 : 0,
    );
  return Number(result.lastInsertRowid);
}

export interface TestOrderItem {
  product_id: number;
  quantity: number;
  unit_price_cents: number;
}

export function insertOrder(
  db: Db,
  values: {
    customer_id: number;
    po_number: string;
    created_at: string;
    status?: OrderStatus;
    discount_pct?: number;
    source?: OrderSource;
    notes?: string | null;
    items?: TestOrderItem[];
  },
): number {
  const result = db
    .prepare(
      `INSERT INTO orders (customer_id, po_number, status, discount_pct, created_at, source, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      values.customer_id,
      values.po_number,
      values.status ?? "pending",
      values.discount_pct ?? 0,
      values.created_at,
      values.source ?? "manual",
      values.notes ?? null,
    );
  const orderId = Number(result.lastInsertRowid);

  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
  );
  for (const item of values.items ?? []) {
    insertItem.run(orderId, item.product_id, item.quantity, item.unit_price_cents);
  }
  return orderId;
}
