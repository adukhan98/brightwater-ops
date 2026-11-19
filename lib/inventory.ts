import type { Db } from "./db";
import type { LowStockRow, Product } from "./types";

export function listProducts(db: Db): Product[] {
  return db
    .prepare("SELECT * FROM products ORDER BY name")
    .all() as Product[];
}

export function getLowStock(db: Db): LowStockRow[] {
  return db
    .prepare(
      `SELECT *, stock_on_hand AS available
         FROM products
        WHERE stock_on_hand <= reorder_point
        ORDER BY name`,
    )
    .all() as LowStockRow[];
}
