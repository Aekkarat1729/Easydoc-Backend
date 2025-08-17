-- AlterTable
ALTER TABLE "Sent" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "depth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "statusById" INTEGER,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "threadId" INTEGER;

-- CreateTable
CREATE TABLE "SentStatusHistory" (
    "id" SERIAL NOT NULL,
    "sentId" INTEGER NOT NULL,
    "from" "DocumentStatus" NOT NULL,
    "to" "DocumentStatus" NOT NULL,
    "changedById" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "SentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sent_parentSentId_idx" ON "Sent"("parentSentId");

-- CreateIndex
CREATE INDEX "Sent_threadId_depth_idx" ON "Sent"("threadId", "depth");

-- CreateIndex
CREATE INDEX "Sent_status_idx" ON "Sent"("status");

-- AddForeignKey
ALTER TABLE "Sent" ADD CONSTRAINT "Sent_statusById_fkey" FOREIGN KEY ("statusById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentStatusHistory" ADD CONSTRAINT "SentStatusHistory_sentId_fkey" FOREIGN KEY ("sentId") REFERENCES "Sent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentStatusHistory" ADD CONSTRAINT "SentStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
