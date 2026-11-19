import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { getDailySummary, getRevenueSummary } from "@/lib/reports";
import { insertCustomer, insertOrder, insertProduct, makeTestDb } from "./helpers";

const NOW = new Date("2026-11-12T22:00:00.000Z");

describe("reports", () => {
  let db: Db;
  let customerId: number;
  let productId: number;

  const delivered = (createdAt: string, quantity: number, discountPct = 0) =>
    insertOrder(db, {
      customer_id: customerId,
      po_number: `PO-${createdAt}`,
      created_at: createdAt,
      status: "delivered",
      discount_pct: discountPct,
      items: [{ product_id: productId, quantity, unit_price_cents: 1000 }],
    });

  beforeEach(() => {
    db = makeTestDb();
    customerId = insertCustomer(db, { name: "Juniper Cafe" });
    productId = insertProduct(db, { sku: "SYR-HAZEL-750", unit_price_cents: 1000 });
  });

  it("adds up revenue for the last 30 days and month to date", () => {
    delivered("2026-11-12T20:00:00.000Z", 3); // today
    delivered("2026-11-03T20:00:00.000Z", 5); // this month
    delivered("2026-10-28T20:00:00.000Z", 7); // last month, within 30 days
    delivered("2026-09-30T20:00:00.000Z", 9); // older than 30 days

    const summary = getRevenueSummary(db, NOW);
    expect(summary.last30DaysCents).toBe(15000);
    expect(summary.monthToDateCents).toBe(8000);
  });

  it("uses discounted order totals for revenue", () => {
    delivered("2026-11-10T20:00:00.000Z", 10, 5); // 10000 * 0.95
    delivered("2026-11-11T20:00:00.000Z", 4, 25); // 4000 * 0.75

    expect(getRevenueSummary(db, NOW).last30DaysCents).toBe(12500);
  });

  it("counts orders placed today", () => {
    delivered("2026-11-12T20:00:00.000Z", 1);
    delivered("2026-11-12T19:30:00.000Z", 1);
    delivered("2026-11-11T20:00:00.000Z", 1);

    expect(getRevenueSummary(db, NOW).ordersToday).toBe(2);
  });

  it("counts pending and processing orders as open", () => {
    const statuses = ["pending", "processing", "processing", "shipped", "delivered"] as const;
    statuses.forEach((status, i) => {
      insertOrder(db, {
        customer_id: customerId,
        po_number: `JUN-${700 + i}`,
        created_at: "2026-11-12T20:00:00.000Z",
        status,
      });
    });
    expect(getRevenueSummary(db, NOW).openOrders).toBe(3);
  });

  it("returns one row per day, newest first, including empty days", () => {
    delivered("2026-11-12T20:00:00.000Z", 2);
    delivered("2026-11-10T20:00:00.000Z", 4);
    delivered("2026-11-10T21:15:00.000Z", 1, 10);

    const rows = getDailySummary(db, NOW, 7);
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.day)).toEqual([
      "2026-11-12",
      "2026-11-11",
      "2026-11-10",
      "2026-11-09",
      "2026-11-08",
      "2026-11-07",
      "2026-11-06",
    ]);
    expect(rows[0]).toEqual({ day: "2026-11-12", orders: 1, revenueCents: 2000 });
    expect(rows[1]).toEqual({ day: "2026-11-11", orders: 0, revenueCents: 0 });
    expect(rows[2]).toEqual({ day: "2026-11-10", orders: 2, revenueCents: 4900 });
  });

  it("crosses month boundaries in the daily summary", () => {
    const rows = getDailySummary(db, new Date("2026-12-02T20:00:00.000Z"), 4);
    expect(rows.map((row) => row.day)).toEqual([
      "2026-12-02",
      "2026-12-01",
      "2026-11-30",
      "2026-11-29",
    ]);
  });
});
