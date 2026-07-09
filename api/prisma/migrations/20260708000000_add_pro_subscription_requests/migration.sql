CREATE TABLE "pro_subscription_requests" (
    "id" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'pro',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "paymentMethod" TEXT NOT NULL DEFAULT 'Orange Money',
    "paymentNumber" TEXT NOT NULL DEFAULT '+23272011156',
    "proofUrl" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pro_subscription_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pro_subscription_requests_djId_idx" ON "pro_subscription_requests"("djId");
CREATE INDEX "pro_subscription_requests_status_idx" ON "pro_subscription_requests"("status");
CREATE INDEX "pro_subscription_requests_createdAt_idx" ON "pro_subscription_requests"("createdAt");

ALTER TABLE "pro_subscription_requests" ADD CONSTRAINT "pro_subscription_requests_djId_fkey" FOREIGN KEY ("djId") REFERENCES "dj_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
