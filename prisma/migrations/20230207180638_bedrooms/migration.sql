-- CreateTable
CREATE TABLE "bedrooms" (
    "id" SERIAL NOT NULL,
    "note" TEXT,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "bedrooms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bedrooms" ADD CONSTRAINT "bedrooms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bedrooms" ADD CONSTRAINT "bedrooms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
