CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" UUID,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_projectId_status_createdAt_idx"
    ON "Task"("projectId", "status", "createdAt");

CREATE INDEX "Task_projectId_createdAt_id_idx"
    ON "Task"("projectId", "createdAt", "id");

CREATE INDEX "Task_projectId_priority_idx"
    ON "Task"("projectId", "priority");

CREATE INDEX "Task_assigneeId_idx"
    ON "Task"("assigneeId");

ALTER TABLE "Task"
    ADD CONSTRAINT "Task_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
    ADD CONSTRAINT "Task_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
