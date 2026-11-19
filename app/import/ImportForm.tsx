"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { importOrdersAction, type ImportState } from "@/app/actions";

const initialState: ImportState = { status: "idle" };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importOrdersAction,
    initialState,
  );
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
  }

  return (
    <div className="stack">
      <form action={formAction} className="card import-form">
        <div className="field">
          <label htmlFor="csv-file" className="label">
            CSV file
          </label>
          <div className="file-row">
            <label className="btn" htmlFor="csv-file">
              Choose file…
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="visually-hidden"
              onChange={handleFile}
            />
            <span className="muted">{fileName ?? "No file chosen"}</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="csv" className="label">
            Contents
          </label>
          <textarea
            id="csv"
            name="csv"
            className="input textarea mono"
            rows={14}
            spellCheck={false}
            placeholder="customer,po_number,sku,quantity,unit_price,notes"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Importing…" : "Import orders"}
          </button>
          {csv && !pending && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCsv("");
                setFileName(null);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {state.status === "error" && (
        <div className="alert alert-error" role="alert">
          {state.message}
        </div>
      )}

      {state.status === "done" && (
        <section className="card" aria-live="polite">
          <div className="card-header">
            <h2>Import result</h2>
            {state.ordersCreated > 0 && (
              <Link href="/orders" className="card-link">
                View orders
              </Link>
            )}
          </div>
          <p
            className={
              state.ordersCreated > 0 ? "result-line success" : "result-line"
            }
          >
            {state.ordersCreated} {state.ordersCreated === 1 ? "order" : "orders"}{" "}
            created, {state.itemsCreated}{" "}
            {state.itemsCreated === 1 ? "line" : "lines"}
          </p>
          {state.errors.length > 0 ? (
            <>
              <h3 className="errors-heading">
                {state.errors.length}{" "}
                {state.errors.length === 1 ? "problem" : "problems"}
              </h3>
              <ul className="error-list">
                {state.errors.map((error, i) => (
                  <li key={`${error.line}-${i}`}>
                    <span className="error-line">Line {error.line}:</span>{" "}
                    {error.message}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">No problems found.</p>
          )}
        </section>
      )}
    </div>
  );
}
