import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ServiceError } from "../../http/service-error.js";
import type { ActivityErrorCode } from "./activity.errors.js";
import type { ActivityListQuery } from "./activity.schemas.js";

const activitySelect = {
  id: true,
  actorId: true,
  actorName: true,
  actorEmail: true,
  eventType: true,
  resourceType: true,
  resourceId: true,
  details: true,
  createdAt: true,
} as const;

export class ActivityServiceError extends ServiceError<ActivityErrorCode> {
  constructor(code: ActivityErrorCode) {
    super(code);
    this.name = "ActivityServiceError";
  }
}

export class ActivityService {
  constructor(private readonly database: PrismaClient) {}

  async listWorkspaceActivity(
    workspaceId: string,
    userId: string,
    query: ActivityListQuery,
  ) {
    const membership = await this.database.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { userId: true },
    });

    if (!membership) {
      throw new ActivityServiceError("NOT_FOUND");
    }

    const where: Prisma.ActivityWhereInput = { workspaceId };
    if (query.eventType !== undefined) {
      where.eventType = query.eventType;
    }
    if (query.resourceType !== undefined) {
      where.resourceType = query.resourceType;
    }

    const skip = (query.page - 1) * query.limit;
    const [activities, total] = await Promise.all([
      this.database.activity.findMany({
        where,
        select: activitySelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: query.limit,
      }),
      this.database.activity.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}

export function createActivityService(database: PrismaClient): ActivityService {
  return new ActivityService(database);
}
