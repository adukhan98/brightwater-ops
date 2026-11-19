import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Import orders</h1>
          <p className="page-subtitle">
            Upload a customer&apos;s weekly order sheet as CSV.
          </p>
        </div>
      </header>

      <div className="import-grid">
        <ImportForm />

        <aside className="card help-card">
          <h2>File format</h2>
          <p>The first line must be this header (columns in any order):</p>
          <pre className="code-block">
            customer,po_number,sku,quantity,unit_price,notes
          </pre>
          <ul className="help-list">
            <li>One line per order line.</li>
            <li>
              Lines with the same <code>customer</code> and{" "}
              <code>po_number</code> become one order.
            </li>
            <li>
              <code>customer</code> must match the customer name exactly, and{" "}
              <code>sku</code> must be an existing product.
            </li>
            <li>
              <code>unit_price</code> is in dollars, e.g. <code>28.50</code>.
            </li>
            <li>
              <code>notes</code> is optional. Imported orders start as
              Pending.
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
