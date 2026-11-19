CREATE TABLE IF NOT EXISTS customers (
  id            INTEGER PRIMARY KEY,
  name          TEXT    NOT NULL UNIQUE,
  contact_email TEXT    NOT NULL,
  discount_pct  REAL    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id               INTEGER PRIMARY KEY,
  sku              TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  stock_on_hand    INTEGER NOT NULL DEFAULT 0,
  reorder_point    INTEGER NOT NULL DEFAULT 0,
  discontinued     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  po_number    TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending',
  discount_pct REAL    NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL,
  shipped_at   TEXT,
  source       TEXT    NOT NULL DEFAULT 'manual',
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id),
  product_id       INTEGER NOT NULL REFERENCES products(id),
  quantity         INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
