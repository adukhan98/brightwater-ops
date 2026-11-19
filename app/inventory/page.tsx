import { getDb } from "@/lib/db";
import { getLowStock, listProducts } from "@/lib/inventory";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default function InventoryPage() {
  const db = getDb();
  const lowStock = getLowStock(db);
  const products = listProducts(db);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Inventory</h1>
          <p className="page-subtitle">
            {products.length} products in the catalogue.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="card-header">
          <h2>
            Low stock <span className="count-badge">{lowStock.length}</span>
          </h2>
        </div>
        {lowStock.length === 0 ? (
          <p className="empty">Nothing is below its reorder point.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th className="num">On hand</th>
                  <th className="num">Reorder point</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.id}>
                    <td className="mono">{product.sku}</td>
                    <td>{product.name}</td>
                    <td className="num warn">{product.available}</td>
                    <td className="num">{product.reorder_point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>All products</h2>
        </div>
        {products.length === 0 ? (
          <p className="empty">No products yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th className="num">Unit price</th>
                  <th className="num">On hand</th>
                  <th className="num">Reorder point</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={product.discontinued ? "row-muted" : undefined}
                  >
                    <td className="mono">{product.sku}</td>
                    <td>{product.name}</td>
                    <td className="num">{formatCents(product.unit_price_cents)}</td>
                    <td className="num">
                      {product.stock_on_hand.toLocaleString("en-US")}
                    </td>
                    <td className="num">{product.reorder_point}</td>
                    <td className="pill-cell">
                      {product.discontinued ? (
                        <span className="pill pill-muted">Discontinued</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
