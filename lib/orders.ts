import type { Db } from "./db";
import type {
  Order,
  OrderItem,
  OrderListRow,
  OrderSource,
  OrderStatus,
  OrderWithItems,
} from "./types";

type Line = { quantity: number; unit_price_cents: number };

interface OrderRecord {
  id: number;
  customer_id: number;
  po_number: string;
  status: OrderStatus;
  discount_pct: number;
  created_at: string;
  shipped_at: string | null;
  source: OrderSource;
  notes: string | null;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "processing",
  processing: "shipped",
  shipped: "delivered",
};

export function orderSubtotalCents(items: Line[]): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0,
  );
}

/** Applies a percentage discount to a subtotal, rounded to whole cents. */
export function applyDiscountCents(subtotalCents: number, discountPct: number): number {
  return Math.round(subtotalCents * (1 - discountPct / 100));
}

export function orderTotalCents(items: Line[], discountPct: number): number {
  return applyDiscountCents(orderSubtotalCents(items), discountPct);
}

export function listOrders(db: Db): OrderListRow[] {
  const orders = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC, id DESC")
    .all() as OrderRecord[];
  const customerStmt = db.prepare("SELECT name FROM customers WHERE id = ?");
  const itemsStmt = db.prepare(
    "SELECT quantity, unit_price_cents FROM order_items WHERE order_id = ?",
  );

  return orders.map((order) => {
    const customer = customerStmt.get(order.customer_id) as
      | { name: string }
      | undefined;
    const items = itemsStmt.all(order.id) as Line[];
    return {
      ...order,
      customer_name: customer?.name ?? "",
      item_count: items.length,
      total_cents: orderTotalCents(items, order.discount_pct),
    };
  });
}

export function getOrder(db: Db, id: number): OrderWithItems | null {
  const order = db
    .prepare(
      `SELECT o.*, c.name AS customer_name
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
        WHERE o.id = ?`,
    )
    .get(id) as Order | undefined;
  if (!order) return null;

  const items = db
    .prepare(
      `SELECT i.id, i.order_id, i.product_id, p.sku, p.name AS product_name,
              i.quantity, i.unit_price_cents
         FROM order_items i
         JOIN products p ON p.id = i.product_id
        WHERE i.order_id = ?
        ORDER BY i.id`,
    )
    .all(id) as OrderItem[];

  return {
    ...order,
    items,
    total_cents: orderTotalCents(items, order.discount_pct),
  };
}

export function advanceOrderStatus(db: Db, id: number, now: Date): OrderStatus {
  const advance = db.transaction((): OrderStatus => {
    const row = db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as
      | { status: OrderStatus }
      | undefined;
    if (!row) throw new Error(`Order ${id} not found`);

    const next = NEXT_STATUS[row.status];
    if (!next) {
      throw new Error(`Order ${id} is ${row.status} and cannot be advanced`);
    }

    if (next === "shipped") {
      db.prepare("UPDATE orders SET status = ?, shipped_at = ? WHERE id = ?").run(
        next,
        now.toISOString(),
        id,
      );
      db.prepare(
        `UPDATE products
            SET stock_on_hand = stock_on_hand - (
              SELECT COALESCE(SUM(quantity), 0)
                FROM order_items
               WHERE order_id = ? AND product_id = products.id
            )
          WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?)`,
      ).run(id, id);
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(next, id);
    }

    return next;
  });

  return advance();
}

export function deleteOrder(db: Db, id: number): void {
  const remove = db.transaction(() => {
    db.prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
    db.prepare("DELETE FROM orders WHERE id = ?").run(id);
  });
  remove();
}
