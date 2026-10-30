import type {
  ActivityEventType,
  ActivityResourceType,
  Prisma,
} from "../../generated/prisma/client.js";

export type ActivityEntry = {
  workspaceId: string;
  eventType: ActivityEventType;
  resourceType: ActivityResourceType;
  resourceId: string;
  details: Prisma.InputJsonObject;
};

export async function recordActivities(
  transaction: Prisma.TransactionClient,
  actorId: string,
  entries: readonly ActivityEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const actor = await transaction.user.findUnique({
    where: { id: actorId },
    select: { name: true, email: true },
  });

  if (!actor) {
    throw new Error("Cannot record activity for an unknown actor.");
  }

  await transaction.activity.createMany({
    data: entries.map((entry) => ({
      ...entry,
      actorId,
      actorName: actor.name,
      actorEmail: actor.email,
    })),
  });
}
