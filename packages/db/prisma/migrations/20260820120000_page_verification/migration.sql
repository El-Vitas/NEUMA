-- Lo que una página dice de sí misma sobre su propia confiabilidad: quién la
-- dio por buena, cuándo, hasta cuándo, y quién responde por ella.
ALTER TABLE "Page" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Page" ADD COLUMN "verifiedById" TEXT;
ALTER TABLE "Page" ADD COLUMN "verificationExpiresAt" TIMESTAMP(3);
ALTER TABLE "Page" ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Page" ADD CONSTRAINT "Page_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "Page" ADD CONSTRAINT "Page_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- Quien mantiene una página la busca por su nombre; el índice sirve a esa lista
-- y a la de lo que está por caducar.
CREATE INDEX "Page_ownerId_idx" ON "Page"("ownerId");
CREATE INDEX "Page_verificationExpiresAt_idx" ON "Page"("verificationExpiresAt");
