"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { importOrders, parseOrdersCsv } from "@/lib/import";
import { advanceOrderStatus, deleteOrder } from "@/lib/orders";
import type { ImportError } from "@/lib/types";

export type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "done";
      ordersCreated: number;
      itemsCreated: number;
      errors: ImportError[];
    };

export async function advanceStatusAction(orderId: number): Promise<void> {
  advanceOrderStatus(getDb(), orderId, new Date());

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function deleteOrderAction(orderId: number): Promise<void> {
  deleteOrder(getDb(), orderId);

  revalidatePath("/orders");
  revalidatePath("/reports");
  revalidatePath("/");
  redirect("/orders");
}

export async function importOrdersAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const csv = formData.get("csv");
  if (typeof csv !== "string" || csv.trim() === "") {
    return {
      status: "error",
      message: "Choose a CSV file or paste its contents before importing.",
    };
  }

  const parsed = parseOrdersCsv(csv);
  const result = importOrders(getDb(), parsed.rows, new Date());

  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/reports");
  revalidatePath("/");

  return {
    status: "done",
    ordersCreated: result.ordersCreated,
    itemsCreated: result.itemsCreated,
    errors: [...parsed.errors, ...result.errors],
  };
}
