CREATE TABLE "SavedView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "countries" JSONB NOT NULL,
    "order" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "SavedView_name_key" ON "SavedView"("name");
