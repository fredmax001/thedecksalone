-- CreateIndex
CREATE INDEX "bookings_djId_status_idx" ON "bookings"("djId", "status");

-- CreateIndex
CREATE INDEX "dj_sets_isPublic_createdAt_idx" ON "dj_sets"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "mixes_isPublic_createdAt_idx" ON "mixes"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "mixes_djId_isPublic_idx" ON "mixes"("djId", "isPublic");
