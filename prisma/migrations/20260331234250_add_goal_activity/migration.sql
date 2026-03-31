-- CreateTable
CREATE TABLE "GoalActivity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "performedBy" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "GoalActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalActivity_goalId_idx" ON "GoalActivity"("goalId");

-- CreateIndex
CREATE INDEX "GoalActivity_createdAt_idx" ON "GoalActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "GoalActivity" ADD CONSTRAINT "GoalActivity_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
