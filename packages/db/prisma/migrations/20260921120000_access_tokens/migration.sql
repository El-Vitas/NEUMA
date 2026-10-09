-- Llaves que una persona le da a un agente para que actúe en su nombre.
--
-- Se guarda el hash del secreto y no el secreto: si la base se filtra, las
-- llaves no se filtran con ella. El comienzo del secreto se guarda aparte para
-- que la persona reconozca cuál es cuál en su lista sin poder usarla.
CREATE TABLE "AccessToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayPrefix" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE CASCADE;
CREATE UNIQUE INDEX "AccessToken_secretHash_key" ON "AccessToken"("secretHash");
CREATE INDEX "AccessToken_userId_idx" ON "AccessToken"("userId");
