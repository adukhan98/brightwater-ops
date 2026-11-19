export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderSource = "manual" | "import";

export interface Customer {
  id: number;
  name: string;
  contact_email: string;
  discount_pct: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  unit_price_cents: number;
  stock_on_hand: number;
  reorder_point: number;
  discontinued: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
}

export interface Order {
  id: number;
  customer_id: number;
  customer_name: string;
  po_number: string;
  status: OrderStatus;
  discount_pct: number;
  created_at: string;
  shipped_at: string | null;
  source: OrderSource;
  notes: string | null;
}

export interface OrderListRow extends Order {
  item_count: number;
  total_cents: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  total_cents: number;
}

export interface RevenueSummary {
  last30DaysCents: number;
  monthToDateCents: number;
  ordersToday: number;
  openOrders: number;
}

export interface DailySummaryRow {
  /** Calendar day, YYYY-MM-DD */
  day: string;
  orders: number;
  revenueCents: number;
}

export interface LowStockRow extends Product {
  available: number;
}

export interface ImportRow {
  /** 1-based line number in the uploaded file (header is line 1) */
  line: number;
  customer: string;
  po_number: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  notes: string;
}

export interface ImportError {
  line: number;
  message: string;
}

export interface ParsedImport {
  rows: ImportRow[];
  errors: ImportError[];
}

export interface ImportResult {
  ordersCreated: number;
  itemsCreated: number;
  errors: ImportError[];
}
