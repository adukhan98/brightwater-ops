import Link from "next/link";
import { getDb } from "@/lib/db";
import { getLowStock } from "@/lib/inventory";
import { formatCents } from "@/lib/money";
import { getDailySummary, getRevenueSummary } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = getDb();
  const now = new Date();
  const summary = getRevenueSummary(db, now);
  const lastWeek = getDailySummary(db, now, 7);
  const lowStock = getLowStock(db);

  const tiles = [
    { label: "Revenue, last 30 days", value: formatCents(summary.last30DaysCents) },
    { label: "Revenue, month to date", value: formatCents(summary.monthToDateCents) },
    { label: "Orders today", value: summary.ordersToday.toLocaleString("en-US") },
    { label: "Open orders", value: summary.openOrders.toLocaleString("en-US") },
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/import" className="btn">
          Import orders
        </Link>
      </header>

      <section className="stat-grid" aria-label="Key figures">
        {tiles.map((tile) => (
          <div key={tile.label} className="stat-tile">
            <div className="stat-label">{tile.label}</div>
            <div className="stat-value">{tile.value}</div>
          </div>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <h2>Last 7 days</h2>
            <Link href="/reports" className="card-link">
              Reports
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th className="num">Orders</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {lastWeek.map((row) => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td className="num">{row.orders}</td>
                  <td className="num">{formatCents(row.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>
              Low stock <span className="count-badge">{lowStock.length}</span>
            </h2>
            <Link href="/inventory" className="card-link">
              View inventory
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="empty">Nothing is below its reorder point.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">On hand</th>
                  <th className="num">Reorder at</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 5).map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div>{product.name}</div>
                      <div className="sub mono">{product.sku}</div>
                    </td>
                    <td className="num">{product.available}</td>
                    <td className="num">{product.reorder_point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {lowStock.length > 5 && (
            <div className="card-footer">
              <Link href="/inventory">
                {lowStock.length - 5} more on the inventory page
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
