-- CreateTable
CREATE TABLE "SavedView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ind" TEXT NOT NULL,
    "yr" INTEGER,
    "ctry" TEXT NOT NULL,
    "ord" TEXT NOT NULL DEFAULT 'DESC',
    "rgn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_name_key" ON "SavedView"("name");
