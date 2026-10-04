import { db } from "@/db";
import { productGroupItems, productGroups, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function setGroupStatus(id: number, action: "sell" | "open") {
  return db.transaction(async tx => {
    const [group] = await tx.select().from(productGroups).where(eq(productGroups.id, id)).limit(1).for("update");
    if (!group) return null;
    const links = await tx.select().from(productGroupItems).where(eq(productGroupItems.groupId, id));
    const memberIds = links.map(link => link.productId);
    const state = action === "sell" ? { available: false, reservedAt: null } : { available: true, reservedAt: null };
    const [updated] = await tx.update(productGroups).set(state).where(eq(productGroups.id, id)).returning();
    if (memberIds.length) await tx.update(products).set(state).where(inArray(products.id, memberIds));
    return updated;
  });
}
