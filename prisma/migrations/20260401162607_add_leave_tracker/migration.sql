-- CreateTable
CREATE TABLE "LeaveAllowance" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL DEFAULT 15,
    "usedDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeaveAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PTO',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveAllowance_teamMemberId_year_key" ON "LeaveAllowance"("teamMemberId", "year");

-- CreateIndex
CREATE INDEX "LeaveRequest_teamMemberId_idx" ON "LeaveRequest"("teamMemberId");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_idx" ON "LeaveRequest"("startDate");

-- AddForeignKey
ALTER TABLE "LeaveAllowance" ADD CONSTRAINT "LeaveAllowance_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
