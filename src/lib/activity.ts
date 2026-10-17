import { prisma } from "@/lib/prisma";

export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
}) {
  try {
    await prisma.activity.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: params.details || null,
      },
    });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}
