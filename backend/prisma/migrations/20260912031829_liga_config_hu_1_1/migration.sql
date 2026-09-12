-- AlterTable
ALTER TABLE "Liga" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "registraIntercepciones" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "registraMvp" BOOLEAN NOT NULL DEFAULT true;
