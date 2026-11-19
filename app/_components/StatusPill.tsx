import type { OrderStatus } from "@/lib/types";

const labels: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`pill pill-${status}`}>{labels[status]}</span>;
}
