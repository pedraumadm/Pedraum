// /lib/orders.ts
import { getAdmin } from "@/lib/firebaseAdmin";

export type CheckoutKind = "lead" | "produto" | "servico" | "demanda";
export type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "in_process";

export type OrderDoc = {
  id: string; // orderId (UUID)
  userId?: string | null;
  kind: CheckoutKind;
  refId: string; // id do item relacionado
  title: string;
  unitPriceCents: number;
  quantity: number;
  currency_id: "BRL";
  preferenceId: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  externalReference?: string; // "kind:refId:orderId"
  status: PaymentStatus;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | Date;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | Date;
  raw?: any;
};

export async function createOrderDoc(
  orderId: string,
  data: Omit<OrderDoc, "id">,
) {
  const { db } = getAdmin();
  const ref = db.collection("orders").doc(orderId);
  await ref.set(
    {
      ...data,
      id: orderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function updateOrderStatus(
  orderId: string,
  updates: Partial<OrderDoc>,
) {
  const { db } = getAdmin();
  const ref = db.collection("orders").doc(orderId);
  await ref.set(
    {
      ...updates,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function getOrder(orderId: string): Promise<OrderDoc | null> {
  const { db } = getAdmin();
  const snap = await db.collection("orders").doc(orderId).get();
  if (!snap.exists) return null;
  return snap.data() as OrderDoc;
}
