"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusPill } from "@/app/_components/StatusPill";
import { formatCents } from "@/lib/money";
import type { OrderListRow, OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

type SortDirection = "desc" | "asc";

export function OrdersTable({ orders }: { orders: OrderListRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [sort, setSort] = useState<SortDirection>("desc");

  const needle = query.trim().toLowerCase();
  const visible = orders
    .filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (!needle) return true;
      return (
        order.customer_name.toLowerCase().includes(needle) ||
        order.po_number.toLowerCase().includes(needle) ||
        order.status.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === "desc" ? -diff : diff;
    });

  return (
    <section className="card">
      <div className="toolbar">
        <input
          type="search"
          className="input search"
          placeholder="Search customer, PO number or status"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search orders"
        />
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <span className="toolbar-meta">
          {visible.length.toLocaleString("en-US")} of{" "}
          {orders.length.toLocaleString("en-US")} orders
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          {orders.length === 0
            ? "No orders yet. Import a CSV to get started."
            : "No orders match your search."}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>PO number</th>
                <th>Customer</th>
                <th>
                  <button
                    type="button"
                    className="sort-button"
                    onClick={() => setSort(sort === "desc" ? "asc" : "desc")}
                    aria-label={`Sort by date, ${sort === "desc" ? "oldest" : "newest"} first`}
                  >
                    Created {sort === "desc" ? "↓" : "↑"}
                  </button>
                </th>
                <th>Status</th>
                <th className="hide-narrow">Source</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/orders/${order.id}`} className="row-link mono">
                      {order.po_number}
                    </Link>
                  </td>
                  <td>{order.customer_name}</td>
                  <td className="nowrap">
                    {new Date(order.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <StatusPill status={order.status} />
                  </td>
                  <td className="muted hide-narrow">
                    {order.source === "import" ? "Import" : "Manual"}
                  </td>
                  <td className="num">{order.item_count}</td>
                  <td className="num">{formatCents(order.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
