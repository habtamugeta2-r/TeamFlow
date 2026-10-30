-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED', 'TASK_COMPLETED', 'TASK_ASSIGNED', 'TASK_UNASSIGNED', 'TASK_PRIORITY_CHANGED');

-- CreateEnum
CREATE TYPE "ActivityResourceType" AS ENUM ('PROJECT', 'TASK');

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "actorId" UUID,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "eventType" "ActivityEventType" NOT NULL,
    "resourceType" "ActivityResourceType" NOT NULL,
    "resourceId" UUID NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_workspaceId_createdAt_id_idx" ON "Activity"("workspaceId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Activity_workspaceId_resourceType_resourceId_idx" ON "Activity"("workspaceId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Activity_actorId_idx" ON "Activity"("actorId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
