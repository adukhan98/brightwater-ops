import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { getLowStock, listProducts } from "@/lib/inventory";
import { insertProduct, makeTestDb } from "./helpers";

describe("inventory", () => {
  let db: Db;

  beforeEach(() => {
    db = makeTestDb();
    insertProduct(db, { sku: "SUG-CANE-1KG", name: "Cane Sugar 1kg", stock_on_hand: 80, reorder_point: 20 });
    insertProduct(db, { sku: "STR-PAPER-500", name: "Paper Straws (500)", stock_on_hand: 12, reorder_point: 15 });
    insertProduct(db, { sku: "COC-POWDER-1KG", name: "Cocoa Powder 1kg", stock_on_hand: 10, reorder_point: 10 });
    insertProduct(db, { sku: "LID-FLAT-8OZ", name: "Flat Lids 8oz", stock_on_hand: 11, reorder_point: 10 });
  });

  it("lists all products by name", () => {
    expect(listProducts(db).map((p) => p.sku)).toEqual([
      "SUG-CANE-1KG",
      "COC-POWDER-1KG",
      "LID-FLAT-8OZ",
      "STR-PAPER-500",
    ]);
  });

  it("flags products at or below their reorder point", () => {
    const low = getLowStock(db);
    expect(low.map((p) => p.sku)).toEqual(["COC-POWDER-1KG", "STR-PAPER-500"]);
  });

  it("reports available stock for low products", () => {
    const low = getLowStock(db);
    expect(low.find((p) => p.sku === "STR-PAPER-500")).toMatchObject({
      stock_on_hand: 12,
      reorder_point: 15,
      available: 12,
    });
  });
});
