-- CreateTable
CREATE TABLE "DashboardView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "indicatorCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sortOrder" TEXT NOT NULL,
    "region" TEXT,
    "countryCodes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DashboardView_indicatorCode_fkey" FOREIGN KEY ("indicatorCode") REFERENCES "Indicator" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
