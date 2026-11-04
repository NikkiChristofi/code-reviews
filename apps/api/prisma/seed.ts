import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.greeting.count();
  if (count > 0) {
    console.log(`Database already seeded (${count} greetings). Skipping.`);
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

  // saved views
  const svCount = await prisma.savedView.count();
  if (svCount == 0) {
    await prisma.savedView.createMany({
      data: [
        { name: "G7 GDP per capita", ind: "NY.GDP.PCAP.CD", ctry: "GBR,USA,FRA,DEU,JPN,ITA,CAN", ord: "DESC" },
        { name: "Life expectancy - Sub-Saharan Africa", ind: "SP.DYN.LE00.IN", ctry: "NGA,ETH,KEN,ZAF,GHA", ord: "ASC", rgn: "Sub-Saharan Africa" },
        { name: "Internet users 2015", ind: "IT.NET.USER.ZS", yr: 2015, ctry: "GBR,IND,CHN,BRA", ord: "DESC" },
      ],
    });
    console.log("Seeded 3 saved views.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
