import { getDb } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { getDailySummary } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const days = getDailySummary(getDb(), new Date(), 14);
  const maxRevenue = Math.max(0, ...days.map((d) => d.revenueCents));
  const totalOrders = days.reduce((sum, d) => sum + d.orders, 0);
  const totalRevenue = days.reduce((sum, d) => sum + d.revenueCents, 0);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">Orders and revenue by day.</p>
        </div>
      </header>

      <section className="card">
        <div className="card-header">
          <h2>Daily summary, last 14 days</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th className="num">Orders</th>
                <th className="num">Revenue</th>
                <th className="bar-col" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {days.map((row) => (
                <tr key={row.day}>
                  <td className="nowrap">{row.day}</td>
                  <td className="num">{row.orders}</td>
                  <td className="num">{formatCents(row.revenueCents)}</td>
                  <td className="bar-col" aria-hidden="true">
                    <div className="bar-track">
                      <div
                        className="bar"
                        style={{
                          width: `${maxRevenue > 0 ? (row.revenueCents / maxRevenue) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td>Total</td>
                <td className="num">{totalOrders}</td>
                <td className="num">{formatCents(totalRevenue)}</td>
                <td className="bar-col" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}
