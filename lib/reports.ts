import type { Db } from "./db";
import { applyDiscountCents } from "./orders";
import type { DailySummaryRow, OrderStatus, RevenueSummary } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

interface OrderTotal {
  created_at: string;
  status: OrderStatus;
  total_cents: number;
}

/** Calendar day (YYYY-MM-DD) that a timestamp belongs to. */
function dayOf(timestamp: string): string {
  return timestamp.slice(0, 10);
}

/** Calendar day `n` days before the given YYYY-MM-DD day. */
function daysBefore(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Every order created at or after `sinceIso`, with its discounted total. */
function orderTotalsSince(db: Db, sinceIso: string): OrderTotal[] {
  const rows = db
    .prepare(
      `SELECT o.created_at, o.status, o.discount_pct,
              COALESCE(SUM(i.quantity * i.unit_price_cents), 0) AS subtotal_cents
         FROM orders o
         LEFT JOIN order_items i ON i.order_id = o.id
        WHERE o.created_at >= ?
        GROUP BY o.id`,
    )
    .all(sinceIso) as {
    created_at: string;
    status: OrderStatus;
    discount_pct: number;
    subtotal_cents: number;
  }[];

  return rows.map((row) => ({
    created_at: row.created_at,
    status: row.status,
    total_cents: applyDiscountCents(row.subtotal_cents, row.discount_pct),
  }));
}

export function getRevenueSummary(db: Db, now: Date): RevenueSummary {
  const nowIso = now.toISOString();
  const today = dayOf(nowIso);
  const monthStart = `${today.slice(0, 7)}-01`;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS).toISOString();

  const since = [thirtyDaysAgo, `${monthStart}T00:00:00.000Z`].sort()[0];
  const orders = orderTotalsSince(db, since).filter(
    (order) => order.created_at <= nowIso,
  );

  let last30DaysCents = 0;
  let monthToDateCents = 0;
  let ordersToday = 0;
  for (const order of orders) {
    const day = dayOf(order.created_at);
    if (order.created_at >= thirtyDaysAgo) last30DaysCents += order.total_cents;
    if (day >= monthStart) monthToDateCents += order.total_cents;
    if (day === today) ordersToday += 1;
  }

  const open = db
    .prepare(
      "SELECT COUNT(*) AS count FROM orders WHERE status IN ('pending', 'processing')",
    )
    .get() as { count: number };

  return {
    last30DaysCents,
    monthToDateCents,
    ordersToday,
    openOrders: open.count,
  };
}

export function getDailySummary(db: Db, now: Date, days: number): DailySummaryRow[] {
  const today = dayOf(now.toISOString());
  const rows: DailySummaryRow[] = [];
  const byDay = new Map<string, DailySummaryRow>();
  for (let i = 0; i < days; i++) {
    const row = { day: daysBefore(today, i), orders: 0, revenueCents: 0 };
    rows.push(row);
    byDay.set(row.day, row);
  }
  if (rows.length === 0) return rows;

  const oldest = rows[rows.length - 1].day;
  for (const order of orderTotalsSince(db, `${oldest}T00:00:00.000Z`)) {
    const row = byDay.get(dayOf(order.created_at));
    if (!row) continue;
    row.orders += 1;
    row.revenueCents += order.total_cents;
  }

  return rows;
}
