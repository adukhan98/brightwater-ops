import Link from "next/link";
import { getDb } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { OrdersTable } from "./OrdersTable";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  const orders = listOrders(getDb());

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle">
            Every order from the order desk and CSV imports.
          </p>
        </div>
        <Link href="/import" className="btn">
          Import orders
        </Link>
      </header>
      <OrdersTable orders={orders} />
    </>
  );
}
