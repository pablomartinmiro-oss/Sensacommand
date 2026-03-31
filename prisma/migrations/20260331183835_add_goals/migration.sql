-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('GM', 'COACH', 'FRONT_DESK', 'MARKETING', 'OPERATIONS', 'FINANCE', 'PRO_SHOP');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NONE');

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "role" "TeamMemberRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "GoalPriority" NOT NULL DEFAULT 'NONE',
    "categories" TEXT[],
    "dueDate" TIMESTAMP(3),
    "dateRequested" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "GoalComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GoalAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GoalAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GoalLinkedPlayers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GoalLinkedPlayers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_email_key" ON "TeamMember"("email");

-- CreateIndex
CREATE INDEX "TeamMember_role_idx" ON "TeamMember"("role");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Goal_priority_idx" ON "Goal"("priority");

-- CreateIndex
CREATE INDEX "Goal_dueDate_idx" ON "Goal"("dueDate");

-- CreateIndex
CREATE INDEX "GoalComment_goalId_idx" ON "GoalComment"("goalId");

-- CreateIndex
CREATE INDEX "GoalComment_authorId_idx" ON "GoalComment"("authorId");

-- CreateIndex
CREATE INDEX "_GoalAssignees_B_index" ON "_GoalAssignees"("B");

-- CreateIndex
CREATE INDEX "_GoalLinkedPlayers_B_index" ON "_GoalLinkedPlayers"("B");

-- AddForeignKey
ALTER TABLE "GoalComment" ADD CONSTRAINT "GoalComment_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalComment" ADD CONSTRAINT "GoalComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalAssignees" ADD CONSTRAINT "_GoalAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalAssignees" ADD CONSTRAINT "_GoalAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalLinkedPlayers" ADD CONSTRAINT "_GoalLinkedPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalLinkedPlayers" ADD CONSTRAINT "_GoalLinkedPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
