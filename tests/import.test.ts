import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { importOrders, parseOrdersCsv } from "@/lib/import";
import { getOrder } from "@/lib/orders";
import { insertCustomer, insertProduct, makeTestDb } from "./helpers";

const HEADER = "customer,po_number,sku,quantity,unit_price,notes";

describe("parseOrdersCsv", () => {
  it("reads order lines with their line numbers", () => {
    const { rows, errors } = parseOrdersCsv(
      [
        HEADER,
        "Juniper Cafe,JUN-501,SYR-HAZEL-750,6,9.75,",
        'Juniper Cafe,JUN-501,SUG-CANE-1KG,2,4.10,"Deliver before 7am, side door"',
      ].join("\n"),
    );

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      line: 2,
      customer: "Juniper Cafe",
      po_number: "JUN-501",
      sku: "SYR-HAZEL-750",
      quantity: 6,
      unit_price_cents: 975,
    });
    expect(rows[1]).toMatchObject({
      line: 3,
      quantity: 2,
      unit_price_cents: 410,
      notes: "Deliver before 7am, side door",
    });
  });

  it("accepts columns in any order and trims values", () => {
    const { rows, errors } = parseOrdersCsv(
      "sku,quantity,unit_price,customer,po_number,notes\r\n SUG-CANE-1KG , 3 , 4.10 , Juniper Cafe , JUN-502 ,\r\n",
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      customer: "Juniper Cafe",
      po_number: "JUN-502",
      sku: "SUG-CANE-1KG",
      quantity: 3,
      unit_price_cents: 410,
    });
  });

  it("rejects a file with a missing column", () => {
    const { rows, errors } = parseOrdersCsv(
      "customer,po_number,sku,quantity,notes\nJuniper Cafe,JUN-503,SUG-CANE-1KG,1,",
    );
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1 });
    expect(errors[0].message).toMatch(/unit_price/);
  });

  it("reports a line with a non-numeric quantity", () => {
    const { rows, errors } = parseOrdersCsv(
      [
        HEADER,
        "Juniper Cafe,JUN-504,SUG-CANE-1KG,2,4.10,",
        "Juniper Cafe,JUN-505,SUG-CANE-1KG,lots,4.10,",
      ].join("\n"),
    );
    expect(rows.map((row) => row.po_number)).toEqual(["JUN-504"]);
    expect(errors).toContainEqual(
      expect.objectContaining({ line: 3, message: expect.stringMatching(/quantity/i) }),
    );
  });
});

describe("importOrders", () => {
  let db: Db;
  const now = new Date("2026-11-16T17:30:00.000Z");

  beforeEach(() => {
    db = makeTestDb();
    insertCustomer(db, { name: "Juniper Cafe", discount_pct: 10 });
    insertCustomer(db, { name: "Old Mill Bakery" });
    insertProduct(db, { sku: "SYR-HAZEL-750", unit_price_cents: 975 });
    insertProduct(db, { sku: "SUG-CANE-1KG", unit_price_cents: 410 });
  });

  const run = (lines: string[]) => {
    const parsed = parseOrdersCsv([HEADER, ...lines].join("\n"));
    expect(parsed.errors).toEqual([]);
    return importOrders(db, parsed.rows, now);
  };

  it("creates one pending order per customer and PO number", () => {
    const result = run([
      "Juniper Cafe,JUN-601,SYR-HAZEL-750,6,9.75,Weekly order",
      "Juniper Cafe,JUN-601,SUG-CANE-1KG,2,4.10,",
      "Old Mill Bakery,7001,SUG-CANE-1KG,10,4.10,",
    ]);

    expect(result).toMatchObject({ ordersCreated: 2, itemsCreated: 3 });
    expect(result.errors).toEqual([]);

    const order = getOrder(db, 1);
    expect(order).toMatchObject({
      customer_name: "Juniper Cafe",
      po_number: "JUN-601",
      status: "pending",
      source: "import",
      discount_pct: 10,
      created_at: "2026-11-16T17:30:00.000Z",
      notes: "Weekly order",
    });
    expect(order?.items).toHaveLength(2);
  });

  it("copies the customer's discount onto imported orders", () => {
    run(["Juniper Cafe,JUN-602,SYR-HAZEL-750,8,9.75,"]);
    // 7800 * 0.90
    expect(getOrder(db, 1)?.total_cents).toBe(7020);
  });

  it("skips orders for unknown customers", () => {
    const result = run(["Nobody Coffee,NOB-1,SUG-CANE-1KG,1,4.10,"]);
    expect(result).toMatchObject({ ordersCreated: 0, itemsCreated: 0 });
    expect(result.errors).toContainEqual(expect.objectContaining({ line: 2 }));
  });

  it("reports unknown SKUs", () => {
    const result = run(["Juniper Cafe,JUN-603,NOT-A-SKU,1,4.10,"]);
    expect(result).toMatchObject({ ordersCreated: 0 });
    expect(result.errors).toContainEqual(expect.objectContaining({ line: 2 }));
  });
});
