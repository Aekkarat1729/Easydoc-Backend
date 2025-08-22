/*
  Warnings:

  - You are about to drop the `SentAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SentAttachment" DROP CONSTRAINT "SentAttachment_documentId_fkey";

-- DropForeignKey
ALTER TABLE "SentAttachment" DROP CONSTRAINT "SentAttachment_sentId_fkey";

-- AlterTable
ALTER TABLE "Sent" ADD COLUMN     "documentIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- DropTable
DROP TABLE "SentAttachment";
