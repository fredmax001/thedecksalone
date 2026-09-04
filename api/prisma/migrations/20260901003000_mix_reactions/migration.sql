-- CreateTable
CREATE TABLE "MixReaction" (
    "id" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MixReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MixReaction_mixId_userId_emoji_key" ON "MixReaction"("mixId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "MixReaction_mixId_idx" ON "MixReaction"("mixId");

-- AddForeignKey
ALTER TABLE "MixReaction" ADD CONSTRAINT "MixReaction_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MixReaction" ADD CONSTRAINT "MixReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
