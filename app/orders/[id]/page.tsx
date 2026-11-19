import Link from "next/link";
import { notFound } from "next/navigation";
import { advanceStatusAction, deleteOrderAction } from "@/app/actions";
import { StatusPill } from "@/app/_components/StatusPill";
import { SubmitButton } from "@/app/_components/SubmitButton";
import { getDb } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { getOrder } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const nextStepLabel: Partial<Record<OrderStatus, string>> = {
  pending: "Mark as processing",
  processing: "Mark as shipped",
  shipped: "Mark as delivered",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const order = getOrder(getDb(), orderId);
  if (!order) notFound();

  const advanceLabel = nextStepLabel[order.status];

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/orders">Orders</Link>
        <span aria-hidden="true">/</span>
        <span>{order.po_number}</span>
      </nav>

      <header className="page-header">
        <div>
          <h1 className="title-with-pill">
            <span>PO {order.po_number}</span>
            <StatusPill status={order.status} />
          </h1>
          <p className="page-subtitle">{order.customer_name}</p>
        </div>
        <div className="actions">
          {advanceLabel && (
            <form action={advanceStatusAction.bind(null, order.id)}>
              <SubmitButton pendingLabel="Saving…">{advanceLabel}</SubmitButton>
            </form>
          )}
          <form action={deleteOrderAction.bind(null, order.id)}>
            <SubmitButton className="btn btn-danger" pendingLabel="Deleting…">
              Delete order
            </SubmitButton>
          </form>
        </div>
      </header>

      <section className="card">
        <dl className="details">
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(order.created_at)}</dd>
          </div>
          <div>
            <dt>Shipped</dt>
            <dd>{order.shipped_at ? formatDateTime(order.shipped_at) : "Not yet"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{order.source === "import" ? "CSV import" : "Manual entry"}</dd>
          </div>
          <div>
            <dt>Order ID</dt>
            <dd className="mono">#{order.id}</dd>
          </div>
        </dl>
        {order.notes && (
          <div className="notes">
            <div className="notes-label">Notes</div>
            <p>{order.notes}</p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Items</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="mono">{item.sku}</td>
                  <td>{item.product_name}</td>
                  <td className="num">{item.quantity.toLocaleString("en-US")}</td>
                  <td className="num">{formatCents(item.unit_price_cents)}</td>
                  <td className="num">
                    {formatCents(item.quantity * item.unit_price_cents)}
                  </td>
                </tr>
              ))}
              {order.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    This order has no items.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={4}>Order total</td>
                <td className="num">{formatCents(order.total_cents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}
