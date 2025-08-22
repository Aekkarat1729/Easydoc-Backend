/*
  Warnings:

  - The `category` column on the `Sent` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Sent" DROP COLUMN "category",
ADD COLUMN     "category" INTEGER;
