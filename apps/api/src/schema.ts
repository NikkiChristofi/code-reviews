import { createSchema } from "graphql-yoga";
import { GraphQLError } from "graphql";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

export const typeDefs = /* GraphQL */ `
  type Greeting {
    id: Int!
    message: String!
    createdAt: String!
  }

  "A country as classified by the World Bank."
  type Country {
    "ISO 3166-1 alpha-3 code, e.g. GBR"
    code: String!
    "ISO 3166-1 alpha-2 code, e.g. GB"
    iso2Code: String!
    name: String!
    region: String!
    regionCode: String!
    incomeLevel: String!
    incomeLevelCode: String!
    capitalCity: String
    latitude: Float
    longitude: Float
    "Observations for this country, optionally filtered by indicator and year range."
    observations(indicatorCode: String, fromYear: Int, toYear: Int): [Observation!]!
  }

  "A World Bank data series, e.g. GDP per capita."
  type Indicator {
    code: String!
    name: String!
    sourceNote: String
    sourceOrganization: String
    lastFetchedAt: String
    "Number of stored observations for this indicator."
    observationCount: Int!
    "Earliest and latest year with data."
    yearRange: YearRange
    "Most recent year with data for at least 100 countries. Use this as a sensible default year."
    latestYear: Int
  }

  type YearRange {
    min: Int!
    max: Int!
  }

  "One indicator value for one country in one year."
  type Observation {
    id: Int!
    countryCode: String!
    indicatorCode: String!
    year: Int!
    value: Float!
    country: Country!
    indicator: Indicator!
  }

  "Row counts and freshness of the ingested dataset."
  type DataSummary {
    countries: Int!
    indicators: Int!
    observations: Int!
    regions: [String!]!
    incomeLevels: [String!]!
    lastIngestedAt: String
  }

  "Headline figures for the dashboard."
  type DashboardSummary {
    "Sum of the latest population figures across all countries."
    worldPopulation: Float!
    worldPopulationYear: Int!
    "Simple (unweighted) mean of life expectancy across countries."
    avgLifeExpectancy: Float!
    avgLifeExpectancyYear: Int!
    countries: Int!
    "Latest year present anywhere in the dataset."
    latestYear: Int!
  }

  "Unweighted mean of an indicator across the countries in a region."
  type RegionAverage {
    region: String!
    regionCode: String!
    average: Float!
    "Number of countries in the region that had a value for the year."
    countryCount: Int!
  }

  type SnapshotValue {
    indicatorCode: String!
    value: Float!
  }

  "Several indicator values for one country in one year."
  type CountrySnapshot {
    country: Country!
    "Only indicators that have a value for the year are present."
    values: [SnapshotValue!]!
  }

  "A dashboard configuration saved so it can be reopened later."
  type SavedView {
    id: Int!
    "Name as entered, trimmed. Unique regardless of case."
    name: String!
    indicatorCode: String!
    year: Int!
    "Countries in the order they were chosen (this sets the chart colours)."
    countries: [String!]!
    order: SortOrder!
    "Region highlighted on the scatter chart, if any."
    region: String
    createdAt: String!
  }

  "Values needed to save a dashboard configuration."
  input SavedViewInput {
    name: String!
    indicatorCode: String!
    year: Int!
    countries: [String!]!
    order: SortOrder = DESC
    region: String
  }

  enum SortOrder {
    ASC
    DESC
  }

  type Query {
    "Simple health-check style query that does not touch the database."
    hello: String!

    "All greetings stored in the SQLite database, newest first."
    greetings: [Greeting!]!

    "Counts and freshness of the World Bank data."
    dataSummary: DataSummary!

    "Countries, optionally filtered by region and/or income level."
    countries(region: String, incomeLevel: String): [Country!]!

    "A single country by ISO3 code."
    country(code: String!): Country

    "All ingested indicators."
    indicators: [Indicator!]!

    "A single indicator by code."
    indicator(code: String!): Indicator

    """
    Observations for an indicator. Filter by country codes and/or year range.
    Results are ordered by year then country code.
    """
    observations(
      indicatorCode: String!
      countryCodes: [String!]
      fromYear: Int
      toYear: Int
    ): [Observation!]!

    """
    Top (or bottom) countries for an indicator in a given year.
    """
    ranking(indicatorCode: String!, year: Int!, limit: Int = 10, order: SortOrder = DESC): [Observation!]!

    "Headline figures for the dashboard."
    dashboardSummary: DashboardSummary!

    "Unweighted mean of an indicator per World Bank region for a year, sorted by average descending."
    regionAverages(indicatorCode: String!, year: Int!): [RegionAverage!]!

    """
    For every country, the values of the requested indicators in a year.
    Countries with no value for any of the indicators are omitted.
    """
    countrySnapshot(indicatorCodes: [String!]!, year: Int!): [CountrySnapshot!]!

    "Saved dashboard views, newest first."
    savedViews(limit: Int = 50): [SavedView!]!
  }

  type Mutation {
    "Store a new greeting in the database and return it."
    addGreeting(message: String!): Greeting!

    "Save a dashboard configuration under a name that is unique regardless of case."
    createSavedView(input: SavedViewInput!): SavedView!

    "Delete a saved dashboard view by id."
    deleteSavedView(id: Int!): Boolean!
  }
`;

type YearArgs = { fromYear?: number | null; toYear?: number | null };

function yearFilter({ fromYear, toYear }: YearArgs): Prisma.IntFilter | undefined {
  if (fromYear == null && toYear == null) return undefined;
  return {
    ...(fromYear != null ? { gte: fromYear } : {}),
    ...(toYear != null ? { lte: toYear } : {}),
  };
}

/** Latest year in which an indicator has values for at least `minCountries` countries. */
async function latestYearWithCoverage(indicatorCode: string, minCountries = 100): Promise<number | null> {
  const rows = await prisma.observation.groupBy({
    by: ["year"],
    where: { indicatorCode },
    _count: { _all: true },
    orderBy: { year: "desc" },
  });
  return rows.find((r) => r._count._all >= minCountries)?.year ?? null;
}

const POPULATION = "SP.POP.TOTL";
const LIFE_EXPECTANCY = "SP.DYN.LE00.IN";

const MAX_SAVED_VIEW_NAME = 60;
const MAX_COUNTRIES = 8;
const ISO3 = /^[A-Z]{3}$/;

type SavedViewRow = {
  id: number;
  name: string;
  indicatorCode: string;
  year: number;
  countries: string;
  order: string;
  region: string | null;
  createdAt: Date;
};

type SavedViewArgs = {
  name: string;
  indicatorCode: string;
  year: number;
  countries: string[];
  order?: "ASC" | "DESC" | null;
  region?: string | null;
};

function toSavedView(row: SavedViewRow) {
  return {
    id: row.id,
    name: row.name,
    indicatorCode: row.indicatorCode,
    year: row.year,
    countries: row.countries.split(","),
    order: row.order,
    region: row.region,
    createdAt: row.createdAt.toISOString(),
  };
}

function prismaErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err ? String(err.code) : undefined;
}

/** Checks a saved view before it is stored. Errors are GraphQLErrors so the user sees the message. */
async function validateSavedView(args: SavedViewArgs) {
  const name = args.name.trim();
  if (!name) throw new GraphQLError("Give the view a name.");
  if (name.length > MAX_SAVED_VIEW_NAME) {
    throw new GraphQLError(`The name must be ${MAX_SAVED_VIEW_NAME} characters or fewer.`);
  }

  const indicatorCode = args.indicatorCode.trim();
  if (!indicatorCode) throw new GraphQLError("Choose an indicator.");
  if (!Number.isInteger(args.year) || args.year < 1) {
    throw new GraphQLError("The year must be a positive whole number.");
  }

  const countries = args.countries.map((c) => c.trim().toUpperCase());
  if (countries.length === 0 || countries.length > MAX_COUNTRIES) {
    throw new GraphQLError(`Choose between 1 and ${MAX_COUNTRIES} countries.`);
  }
  if (countries.some((c) => !ISO3.test(c))) {
    throw new GraphQLError("Country codes must be three letters, e.g. GBR.");
  }
  if (new Set(countries).size !== countries.length) {
    throw new GraphQLError("Each country can only be included once.");
  }

  const [indicator, matchedCountries] = await Promise.all([
    prisma.indicator.findUnique({ where: { code: indicatorCode }, select: { code: true } }),
    prisma.country.count({ where: { code: { in: countries } } }),
  ]);
  if (!indicator) throw new GraphQLError(`Unknown indicator: ${indicatorCode}.`);
  if (matchedCountries !== countries.length) {
    throw new GraphQLError("One or more countries are not in the database.");
  }

  return {
    name,
    nameKey: name.toLowerCase(),
    indicatorCode,
    year: args.year,
    countries: countries.join(","),
    order: args.order === "ASC" ? "ASC" : "DESC",
    region: args.region?.trim() || null,
  };
}

export const resolvers = {
  Query: {
    hello: () => "Hello, World!",

    savedViews: async (_p: unknown, args: { limit?: number | null }) => {
      const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
      const rows = await prisma.savedView.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
      });
      return rows.map(toSavedView);
    },

    greetings: async () => prisma.greeting.findMany({ orderBy: { createdAt: "desc" } }),

    dataSummary: async () => {
      const [countries, indicators, observations, regionRows, incomeRows, latest] = await Promise.all([
        prisma.country.count(),
        prisma.indicator.count(),
        prisma.observation.count(),
        prisma.country.findMany({ distinct: ["region"], select: { region: true }, orderBy: { region: "asc" } }),
        prisma.country.findMany({
          distinct: ["incomeLevel"],
          select: { incomeLevel: true },
          orderBy: { incomeLevel: "asc" },
        }),
        prisma.indicator.findFirst({
          where: { lastFetchedAt: { not: null } },
          orderBy: { lastFetchedAt: "desc" },
          select: { lastFetchedAt: true },
        }),
      ]);
      return {
        countries,
        indicators,
        observations,
        regions: regionRows.map((r) => r.region),
        incomeLevels: incomeRows.map((r) => r.incomeLevel),
        lastIngestedAt: latest?.lastFetchedAt?.toISOString() ?? null,
      };
    },

    countries: async (_p: unknown, args: { region?: string | null; incomeLevel?: string | null }) =>
      prisma.country.findMany({
        where: {
          ...(args.region ? { region: args.region } : {}),
          ...(args.incomeLevel ? { incomeLevel: args.incomeLevel } : {}),
        },
        orderBy: { name: "asc" },
      }),

    country: async (_p: unknown, args: { code: string }) =>
      prisma.country.findUnique({ where: { code: args.code.toUpperCase() } }),

    indicators: async () => prisma.indicator.findMany({ orderBy: { name: "asc" } }),

    indicator: async (_p: unknown, args: { code: string }) =>
      prisma.indicator.findUnique({ where: { code: args.code } }),

    observations: async (
      _p: unknown,
      args: { indicatorCode: string; countryCodes?: string[] | null } & YearArgs,
    ) =>
      prisma.observation.findMany({
        where: {
          indicatorCode: args.indicatorCode,
          ...(args.countryCodes?.length ? { countryCode: { in: args.countryCodes.map((c) => c.toUpperCase()) } } : {}),
          ...(yearFilter(args) ? { year: yearFilter(args) } : {}),
        },
        orderBy: [{ year: "asc" }, { countryCode: "asc" }],
      }),

    ranking: async (
      _p: unknown,
      args: { indicatorCode: string; year: number; limit?: number | null; order?: "ASC" | "DESC" | null },
    ) => {
      const limit = Math.min(Math.max(args.limit ?? 10, 1), 250);
      return prisma.observation.findMany({
        where: { indicatorCode: args.indicatorCode, year: args.year },
        orderBy: { value: args.order === "ASC" ? "asc" : "desc" },
        take: limit,
      });
    },

    dashboardSummary: async () => {
      const [popYear, leYear, countries, latest] = await Promise.all([
        latestYearWithCoverage(POPULATION),
        latestYearWithCoverage(LIFE_EXPECTANCY),
        prisma.country.count(),
        prisma.observation.aggregate({ _max: { year: true } }),
      ]);
      const [pop, le] = await Promise.all([
        popYear == null
          ? null
          : prisma.observation.aggregate({ where: { indicatorCode: POPULATION, year: popYear }, _sum: { value: true } }),
        leYear == null
          ? null
          : prisma.observation.aggregate({ where: { indicatorCode: LIFE_EXPECTANCY, year: leYear }, _avg: { value: true } }),
      ]);
      return {
        worldPopulation: pop?._sum.value ?? 0,
        worldPopulationYear: popYear ?? 0,
        avgLifeExpectancy: le?._avg.value ?? 0,
        avgLifeExpectancyYear: leYear ?? 0,
        countries,
        latestYear: latest._max.year ?? 0,
      };
    },

    regionAverages: async (_p: unknown, args: { indicatorCode: string; year: number }) => {
      const rows = await prisma.observation.findMany({
        where: { indicatorCode: args.indicatorCode, year: args.year },
        select: { value: true, country: { select: { region: true, regionCode: true } } },
      });
      const buckets = new Map<string, { region: string; regionCode: string; sum: number; count: number }>();
      for (const row of rows) {
        const b = buckets.get(row.country.regionCode) ?? {
          region: row.country.region,
          regionCode: row.country.regionCode,
          sum: 0,
          count: 0,
        };
        b.sum += row.value;
        b.count += 1;
        buckets.set(row.country.regionCode, b);
      }
      return [...buckets.values()]
        .map((b) => ({ region: b.region, regionCode: b.regionCode, average: b.sum / b.count, countryCount: b.count }))
        .sort((a, b) => b.average - a.average);
    },

    countrySnapshot: async (_p: unknown, args: { indicatorCodes: string[]; year: number }) => {
      const rows = await prisma.observation.findMany({
        where: { indicatorCode: { in: args.indicatorCodes }, year: args.year },
        include: { country: true },
        orderBy: { countryCode: "asc" },
      });
      const byCountry = new Map<string, { country: (typeof rows)[number]["country"]; values: { indicatorCode: string; value: number }[] }>();
      for (const row of rows) {
        const entry = byCountry.get(row.countryCode) ?? { country: row.country, values: [] };
        entry.values.push({ indicatorCode: row.indicatorCode, value: row.value });
        byCountry.set(row.countryCode, entry);
      }
      return [...byCountry.values()];
    },
  },

  Mutation: {
    createSavedView: async (_p: unknown, args: { input: SavedViewArgs }) => {
      const data = await validateSavedView(args.input);
      try {
        const row = await prisma.savedView.create({ data });
        return toSavedView(row);
      } catch (err) {
        if (prismaErrorCode(err) === "P2002") {
          throw new GraphQLError(`A saved view called "${data.name}" already exists. Choose another name.`);
        }
        throw err;
      }
    },

    deleteSavedView: async (_p: unknown, args: { id: number }) => {
      try {
        await prisma.savedView.delete({ where: { id: args.id } });
        return true;
      } catch (err) {
        if (prismaErrorCode(err) === "P2025") {
          throw new GraphQLError("That saved view no longer exists. Refresh the page to see the current list.");
        }
        throw err;
      }
    },

    addGreeting: async (_parent: unknown, args: { message: string }) => {
      const message = args.message.trim();
      if (!message) {
        throw new Error("Greeting message cannot be empty.");
      }
      return prisma.greeting.create({ data: { message } });
    },
  },

  Greeting: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },

  Country: {
    observations: async (parent: { code: string }, args: { indicatorCode?: string | null } & YearArgs) =>
      prisma.observation.findMany({
        where: {
          countryCode: parent.code,
          ...(args.indicatorCode ? { indicatorCode: args.indicatorCode } : {}),
          ...(yearFilter(args) ? { year: yearFilter(args) } : {}),
        },
        orderBy: [{ indicatorCode: "asc" }, { year: "asc" }],
      }),
  },

  Indicator: {
    lastFetchedAt: (parent: { lastFetchedAt: Date | null }) => parent.lastFetchedAt?.toISOString() ?? null,
    observationCount: (parent: { code: string }) =>
      prisma.observation.count({ where: { indicatorCode: parent.code } }),
    latestYear: (parent: { code: string }) => latestYearWithCoverage(parent.code),
    yearRange: async (parent: { code: string }) => {
      const agg = await prisma.observation.aggregate({
        where: { indicatorCode: parent.code },
        _min: { year: true },
        _max: { year: true },
      });
      if (agg._min.year == null || agg._max.year == null) return null;
      return { min: agg._min.year, max: agg._max.year };
    },
  },

  Observation: {
    country: (parent: { countryCode: string }) =>
      prisma.country.findUniqueOrThrow({ where: { code: parent.countryCode } }),
    indicator: (parent: { indicatorCode: string }) =>
      prisma.indicator.findUniqueOrThrow({ where: { code: parent.indicatorCode } }),
  },
};

export const schema = createSchema({ typeDefs, resolvers });
