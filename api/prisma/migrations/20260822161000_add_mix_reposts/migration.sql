-- CreateTable
CREATE TABLE "mix_reposts" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mix_reposts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mix_reposts_mixId_userId_key" ON "mix_reposts"("mixId", "userId");

-- CreateIndex
CREATE INDEX "mix_reposts_mixId_idx" ON "mix_reposts"("mixId");

-- CreateIndex
CREATE INDEX "mix_reposts_userId_idx" ON "mix_reposts"("userId");

-- AddForeignKey
ALTER TABLE "mix_reposts" ADD CONSTRAINT "mix_reposts_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mix_reposts" ADD CONSTRAINT "mix_reposts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
