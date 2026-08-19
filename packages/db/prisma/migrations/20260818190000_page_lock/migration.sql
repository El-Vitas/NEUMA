-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT;
