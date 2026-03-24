-- AlterTable: add defaultSlideDurationSeconds to Profile
ALTER TABLE "Profile" ADD COLUMN "defaultSlideDurationSeconds" INTEGER NOT NULL DEFAULT 30;

-- CreateTable: Slide
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SlideItem
CREATE TABLE "SlideItem" (
    "id" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "widgetInstanceId" TEXT NOT NULL,
    "layoutX" INTEGER NOT NULL DEFAULT 0,
    "layoutY" INTEGER NOT NULL DEFAULT 0,
    "layoutW" INTEGER NOT NULL DEFAULT 1,
    "layoutH" INTEGER NOT NULL DEFAULT 1,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlideItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Slide_profileId_idx" ON "Slide"("profileId");
CREATE INDEX "Slide_profileId_order_idx" ON "Slide"("profileId", "order");
CREATE UNIQUE INDEX "SlideItem_widgetInstanceId_key" ON "SlideItem"("widgetInstanceId");
CREATE INDEX "SlideItem_slideId_idx" ON "SlideItem"("slideId");

-- AddForeignKey
ALTER TABLE "Slide" ADD CONSTRAINT "Slide_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlideItem" ADD CONSTRAINT "SlideItem_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlideItem" ADD CONSTRAINT "SlideItem_widgetInstanceId_fkey" FOREIGN KEY ("widgetInstanceId") REFERENCES "WidgetInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: create one default Slide per existing Profile
INSERT INTO "Slide" ("id", "profileId", "name", "order", "isEnabled", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    "id",
    'Default',
    0,
    true,
    NOW(),
    NOW()
FROM "Profile";

-- DataMigration: create SlideItems for all existing WidgetInstances
INSERT INTO "SlideItem" ("id", "slideId", "widgetInstanceId", "layoutX", "layoutY", "layoutW", "layoutH", "zIndex", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    s."id",
    wi."id",
    wi."layoutX",
    wi."layoutY",
    wi."layoutW",
    wi."layoutH",
    0,
    NOW(),
    NOW()
FROM "WidgetInstance" wi
JOIN "Slide" s ON s."profileId" = wi."profileId" AND s."order" = 0;
