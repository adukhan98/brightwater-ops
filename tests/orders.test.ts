import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import {
  advanceOrderStatus,
  getOrder,
  listOrders,
  orderSubtotalCents,
  orderTotalCents,
} from "@/lib/orders";
import { insertCustomer, insertOrder, insertProduct, makeTestDb } from "./helpers";

describe("order totals", () => {
  it("adds up quantity times unit price", () => {
    expect(
      orderSubtotalCents([
        { quantity: 3, unit_price_cents: 1250 },
        { quantity: 1, unit_price_cents: 4999 },
      ]),
    ).toBe(8749);
  });

  it("returns the subtotal when there is no discount", () => {
    expect(orderTotalCents([{ quantity: 2, unit_price_cents: 1999 }], 0)).toBe(3998);
  });

  it("applies the customer discount to the order total", () => {
    expect(orderTotalCents([{ quantity: 4, unit_price_cents: 2500 }], 10)).toBe(9000);
  });

  it("rounds the discounted total to whole cents", () => {
    // 8749 * 0.90 = 7874.1
    expect(
      orderTotalCents(
        [
          { quantity: 3, unit_price_cents: 1250 },
          { quantity: 1, unit_price_cents: 4999 },
        ],
        10,
      ),
    ).toBe(7874);
    // 2331 * 0.85 = 1981.35
    expect(orderTotalCents([{ quantity: 7, unit_price_cents: 333 }], 15)).toBe(1981);
  });
});

describe("orders", () => {
  let db: Db;
  let customerId: number;
  let beansId: number;
  let cupsId: number;

  beforeEach(() => {
    db = makeTestDb();
    customerId = insertCustomer(db, { name: "Northside Deli", discount_pct: 8 });
    beansId = insertProduct(db, {
      sku: "BEAN-DECAF-1KG",
      name: "Decaf Blend 1kg",
      unit_price_cents: 2600,
      stock_on_hand: 50,
    });
    cupsId = insertProduct(db, {
      sku: "CUP-PAPER-8OZ",
      name: "Paper Cups 8oz",
      unit_price_cents: 2900,
      stock_on_hand: 40,
    });
  });

  it("returns an order with its items and discounted total", () => {
    const id = insertOrder(db, {
      customer_id: customerId,
      po_number: "NSD-0042",
      created_at: "2026-11-02T18:00:00.000Z",
      discount_pct: 8,
      items: [
        { product_id: beansId, quantity: 10, unit_price_cents: 2600 },
        { product_id: cupsId, quantity: 3, unit_price_cents: 2900 },
      ],
    });

    const order = getOrder(db, id);
    expect(order).toMatchObject({
      po_number: "NSD-0042",
      customer_name: "Northside Deli",
      discount_pct: 8,
    });
    expect(order?.items.map((item) => [item.sku, item.product_name, item.quantity])).toEqual([
      ["BEAN-DECAF-1KG", "Decaf Blend 1kg", 10],
      ["CUP-PAPER-8OZ", "Paper Cups 8oz", 3],
    ]);
    // (26000 + 8700) * 0.92 = 31924
    expect(order?.total_cents).toBe(31924);
  });

  it("uses the discount stored on the order", () => {
    const id = insertOrder(db, {
      customer_id: customerId,
      po_number: "NSD-0043",
      created_at: "2026-11-02T18:00:00.000Z",
      discount_pct: 5,
      items: [{ product_id: beansId, quantity: 3, unit_price_cents: 2640 }],
    });
    // 7920 * 0.95 = 7524
    expect(getOrder(db, id)?.total_cents).toBe(7524);
  });

  it("returns null for an unknown order", () => {
    expect(getOrder(db, 999)).toBeNull();
  });

  it("moves an order through processing, shipped and delivered", () => {
    const id = insertOrder(db, {
      customer_id: customerId,
      po_number: "NSD-0044",
      created_at: "2026-11-02T18:00:00.000Z",
      items: [{ product_id: beansId, quantity: 1, unit_price_cents: 2600 }],
    });
    const now = new Date("2026-11-03T16:00:00.000Z");

    expect(advanceOrderStatus(db, id, now)).toBe("processing");
    expect(getOrder(db, id)?.shipped_at).toBeNull();
    expect(advanceOrderStatus(db, id, now)).toBe("shipped");
    expect(getOrder(db, id)?.shipped_at).toBe("2026-11-03T16:00:00.000Z");
    expect(advanceOrderStatus(db, id, now)).toBe("delivered");
    expect(() => advanceOrderStatus(db, id, now)).toThrow();
  });

  it("takes shipped quantities out of stock", () => {
    const id = insertOrder(db, {
      customer_id: customerId,
      po_number: "NSD-0045",
      created_at: "2026-11-02T18:00:00.000Z",
      status: "processing",
      items: [
        { product_id: beansId, quantity: 12, unit_price_cents: 2600 },
        { product_id: cupsId, quantity: 5, unit_price_cents: 2900 },
      ],
    });

    advanceOrderStatus(db, id, new Date("2026-11-03T16:00:00.000Z"));

    const stock = db
      .prepare("SELECT sku, stock_on_hand FROM products ORDER BY sku")
      .all();
    expect(stock).toEqual([
      { sku: "BEAN-DECAF-1KG", stock_on_hand: 38 },
      { sku: "CUP-PAPER-8OZ", stock_on_hand: 35 },
    ]);
  });

  it("does not advance a cancelled order", () => {
    const id = insertOrder(db, {
      customer_id: customerId,
      po_number: "NSD-0046",
      created_at: "2026-11-02T18:00:00.000Z",
      status: "cancelled",
    });
    expect(() => advanceOrderStatus(db, id, new Date())).toThrow();
  });

  it("lists recent orders newest first with customer and totals", () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
    insertOrder(db, {
      customer_id: customerId,
      po_number: "NSD-0101",
      created_at: hoursAgo(30),
      discount_pct: 8,
      items: [{ product_id: beansId, quantity: 5, unit_price_cents: 2600 }],
    });
    insertOrder(db, {
      customer_id: customerId,
      po_number: "NSD-0102",
      created_at: hoursAgo(2),
      discount_pct: 8,
      items: [
        { product_id: beansId, quantity: 1, unit_price_cents: 2600 },
        { product_id: cupsId, quantity: 2, unit_price_cents: 2900 },
      ],
    });

    const rows = listOrders(db);
    expect(rows.map((row) => row.po_number)).toEqual(["NSD-0102", "NSD-0101"]);
    expect(rows[0]).toMatchObject({
      customer_name: "Northside Deli",
      item_count: 2,
      total_cents: 7728, // 8400 * 0.92
    });
    expect(rows[1]).toMatchObject({ item_count: 1, total_cents: 11960 });
  });
});
