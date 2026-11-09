import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAVED_VIEWS_SEED_KEY = "saved-views-v1";

// Fixed years, so the examples work before (and regardless of) the World Bank ingest.
const EXAMPLE_VIEWS: {
  name: string;
  indicatorCode: string;
  year: number;
  countries: string[];
  order: "ASC" | "DESC";
  region: string | null;
}[] = [
  {
    name: "Life expectancy in Europe",
    indicatorCode: "SP.DYN.LE00.IN",
    year: 2020,
    countries: ["GBR", "FRA", "DEU", "ITA", "ESP"],
    order: "DESC",
    region: "Europe & Central Asia",
  },
  {
    name: "GDP per capita, G7",
    indicatorCode: "NY.GDP.PCAP.CD",
    year: 2020,
    countries: ["GBR", "USA", "FRA", "DEU", "JPN", "ITA", "CAN"],
    order: "DESC",
    region: null,
  },
  {
    name: "Internet use, lowest first",
    indicatorCode: "IT.NET.USER.ZS",
    year: 2020,
    countries: ["NGA", "IND", "BRA", "ZAF", "EGY"],
    order: "ASC",
    region: null,
  },
];

async function seedGreetings() {
  const count = await prisma.greeting.count();
  if (count > 0) {
    console.log(`Greetings already seeded (${count}). Skipping.`);
    return;
  }

  await prisma.greeting.createMany({
    data: [
      { message: "Hello, World!" },
      { message: "Hello from SQLite via Prisma" },
      { message: "Hello from the GraphQL API" },
    ],
  });

  console.log("Seeded 3 greetings.");
}

async function seedSavedViews() {
  // Only seed once, so views the user deletes do not come back on the next start-up.
  const done = await prisma.seedRun.findUnique({ where: { key: SAVED_VIEWS_SEED_KEY } });
  if (done) {
    console.log("Saved views already seeded. Skipping.");
    return;
  }

  for (const view of EXAMPLE_VIEWS) {
    const nameKey = view.name.toLowerCase();
    const exists = await prisma.savedView.findUnique({ where: { nameKey } });
    if (exists) continue;
    await prisma.savedView.create({
      data: {
        name: view.name,
        nameKey,
        indicatorCode: view.indicatorCode,
        year: view.year,
        countries: view.countries.join(","),
        order: view.order,
        region: view.region,
      },
    });
  }

  await prisma.seedRun.create({ data: { key: SAVED_VIEWS_SEED_KEY } });
  console.log(`Seeded ${EXAMPLE_VIEWS.length} example saved views.`);
}

async function main() {
  await seedGreetings();
  await seedSavedViews();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
