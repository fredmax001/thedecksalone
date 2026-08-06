-- DropIndex
DROP INDEX "event_tickets_qrCode_idx";

-- AlterTable
ALTER TABLE "event_tickets" ADD COLUMN     "buyerEmail" TEXT,
ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "buyerPhone" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "checkedInBy" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "qrPayload" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "ticketNumber" TEXT,
ADD COLUMN     "ticketTypeId" TEXT,
ADD COLUMN     "transferredFrom" TEXT,
ALTER COLUMN "paymentScreenshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "ageRestriction" TEXT,
ADD COLUMN     "approvalMode" TEXT NOT NULL DEFAULT 'automatic',
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "musicGenre" TEXT,
ADD COLUMN     "organizerContact" TEXT,
ADD COLUMN     "organizerName" TEXT,
ADD COLUMN     "poster" TEXT,
ADD COLUMN     "publishStatus" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "refundPolicy" TEXT,
ADD COLUMN     "termsConditions" TEXT,
ADD COLUMN     "ticketSaleEndsAt" TIMESTAMP(3),
ADD COLUMN     "ticketSaleStartsAt" TIMESTAMP(3),
ADD COLUMN     "ticketsCheckedIn" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ticketsSold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "event_ticket_types" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "quantity" INTEGER,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "maxPerOrder" INTEGER NOT NULL DEFAULT 10,
    "saleStartsAt" TIMESTAMP(3),
    "saleEndsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_scan_logs" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "eventId" TEXT NOT NULL,
    "scannedBy" TEXT NOT NULL,
    "scannerRole" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_ticket_types_eventId_idx" ON "event_ticket_types"("eventId");

-- CreateIndex
CREATE INDEX "event_ticket_types_isActive_idx" ON "event_ticket_types"("isActive");

-- CreateIndex
CREATE INDEX "event_ticket_types_eventId_isActive_idx" ON "event_ticket_types"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "event_scan_logs_ticketId_idx" ON "event_scan_logs"("ticketId");

-- CreateIndex
CREATE INDEX "event_scan_logs_eventId_idx" ON "event_scan_logs"("eventId");

-- CreateIndex
CREATE INDEX "event_scan_logs_scannedBy_idx" ON "event_scan_logs"("scannedBy");

-- CreateIndex
CREATE INDEX "event_scan_logs_createdAt_idx" ON "event_scan_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_tickets_qrPayload_key" ON "event_tickets"("qrPayload");

-- CreateIndex
CREATE UNIQUE INDEX "event_tickets_ticketNumber_key" ON "event_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "event_tickets_ticketTypeId_idx" ON "event_tickets"("ticketTypeId");

-- CreateIndex
CREATE INDEX "event_tickets_qrPayload_idx" ON "event_tickets"("qrPayload");

-- CreateIndex
CREATE INDEX "event_tickets_ticketNumber_idx" ON "event_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "event_tickets_eventId_status_idx" ON "event_tickets"("eventId", "status");

-- CreateIndex
CREATE INDEX "event_tickets_eventId_ticketTypeId_idx" ON "event_tickets"("eventId", "ticketTypeId");

-- CreateIndex
CREATE INDEX "event_tickets_eventId_createdAt_idx" ON "event_tickets"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "event_tickets_eventId_userId_idx" ON "event_tickets"("eventId", "userId");

-- CreateIndex
CREATE INDEX "events_publishStatus_idx" ON "events"("publishStatus");

-- CreateIndex
CREATE INDEX "events_isTicketed_idx" ON "events"("isTicketed");

-- CreateIndex
CREATE INDEX "events_publishStatus_date_idx" ON "events"("publishStatus", "date");

-- AddForeignKey
ALTER TABLE "event_ticket_types" ADD CONSTRAINT "event_ticket_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "event_ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_scan_logs" ADD CONSTRAINT "event_scan_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "event_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

