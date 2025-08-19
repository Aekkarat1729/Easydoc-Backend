-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'OFFICER';

-- AlterTable
ALTER TABLE "Sent" ADD COLUMN     "remark" TEXT,
ADD COLUMN     "subject" TEXT;
