-- CreateTable
CREATE TABLE "SentAttachment" (
    "id" SERIAL NOT NULL,
    "sentId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentAttachment_sentId_idx" ON "SentAttachment"("sentId");

-- CreateIndex
CREATE INDEX "SentAttachment_documentId_idx" ON "SentAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "SentAttachment_sentId_documentId_key" ON "SentAttachment"("sentId", "documentId");

-- AddForeignKey
ALTER TABLE "SentAttachment" ADD CONSTRAINT "SentAttachment_sentId_fkey" FOREIGN KEY ("sentId") REFERENCES "Sent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentAttachment" ADD CONSTRAINT "SentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
