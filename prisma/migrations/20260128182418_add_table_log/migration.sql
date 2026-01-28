-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
