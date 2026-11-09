import { gqlFetch } from "@/lib/graphql";

/** Indicators that drive the fixed GDP vs life expectancy scatter. */
export const GDP_PER_CAPITA = "NY.GDP.PCAP.CD";
export const LIFE_EXPECTANCY = "SP.DYN.LE00.IN";
export const POPULATION = "SP.POP.TOTL";

export const DEFAULT_INDICATOR = GDP_PER_CAPITA;
export const DEFAULT_COUNTRIES = ["GBR", "USA", "FRA", "DEU", "JPN"];
export const MAX_COUNTRIES = 8;

export type SortOrder = "ASC" | "DESC";

/** The dashboard's state, all of which lives in the URL query string. */
export type DashboardParams = {
  indicator: string;
  year: number | null; // null = use the indicator's latest year
  countries: string[];
  order: SortOrder;
  region: string | null; // scatter highlight
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseParams(sp: RawSearchParams): DashboardParams {
  const yearRaw = Number(first(sp.year));
  const countries = (first(sp.countries) ?? DEFAULT_COUNTRIES.join(","))
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c))
    .slice(0, MAX_COUNTRIES);
  return {
    indicator: first(sp.indicator) ?? DEFAULT_INDICATOR,
    year: Number.isInteger(yearRaw) && yearRaw > 0 ? yearRaw : null,
    countries: countries.length ? countries : DEFAULT_COUNTRIES,
    order: first(sp.order)?.toUpperCase() === "ASC" ? "ASC" : "DESC",
    region: first(sp.region) || null,
  };
}

// ---------------------------------------------------------------- types

export type IndicatorMeta = {
  code: string;
  name: string;
  latestYear: number | null;
  yearRange: { min: number; max: number } | null;
};

export type CountryMeta = {
  code: string;
  name: string;
  region: string;
};

export type DashboardSummary = {
  worldPopulation: number;
  worldPopulationYear: number;
  avgLifeExpectancy: number;
  avgLifeExpectancyYear: number;
  countries: number;
  latestYear: number;
};

export type Observation = {
  countryCode: string;
  year: number;
  value: number;
};

export type RankedObservation = {
  value: number;
  country: { code: string; name: string; region: string };
};

export type RegionAverage = {
  region: string;
  regionCode: string;
  average: number;
  countryCount: number;
};

export type CountrySnapshot = {
  country: { code: string; name: string; region: string };
  values: { indicatorCode: string; value: number }[];
};

export type DashboardMeta = {
  dataSummary: { regions: string[] };
  dashboardSummary: DashboardSummary;
  indicators: IndicatorMeta[];
  countries: CountryMeta[];
  savedViews: SavedView[];
};

export type DashboardData = {
  observations: Observation[];
  ranking: RankedObservation[];
  regionAverages: RegionAverage[];
  countrySnapshot: CountrySnapshot[];
};

export type ScatterPoint = {
  code: string;
  name: string;
  region: string;
  gdp: number;
  life: number;
  population: number | null;
};

/** Build scatter points from a snapshot, keeping only countries that have both axes' values. */
export function toScatterPoints(snapshot: CountrySnapshot[]): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  for (const s of snapshot) {
    const get = (code: string) => s.values.find((v) => v.indicatorCode === code)?.value;
    const gdp = get(GDP_PER_CAPITA);
    const life = get(LIFE_EXPECTANCY);
    if (gdp == null || life == null || gdp <= 0) continue;
    points.push({
      code: s.country.code,
      name: s.country.name,
      region: s.country.region,
      gdp,
      life,
      population: get(POPULATION) ?? null,
    });
  }
  return points;
}

// ---------------------------------------------------------------- saved views

export type SavedView = {
  id: number;
  name: string;
  indicatorCode: string;
  year: number;
  countries: string[];
  order: SortOrder;
  region: string | null;
  createdAt: string;
};

/** The configuration a saved view restores. Mirrors the dashboard URL parameters. */
export type DashboardConfig = {
  indicator: string;
  year: number;
  countries: string[];
  order: SortOrder;
  region: string | null;
};

/** Dashboard URL for a configuration. URLSearchParams encodes names such as "Europe & Central Asia". */
export function buildDashboardUrl(config: DashboardConfig): string {
  const sp = new URLSearchParams({
    indicator: config.indicator,
    year: String(config.year),
    countries: config.countries.join(","),
    order: config.order,
  });
  if (config.region) sp.set("region", config.region);
  return `/dashboard?${sp.toString()}`;
}

export function viewToConfig(view: SavedView): DashboardConfig {
  return {
    indicator: view.indicatorCode,
    year: view.year,
    countries: view.countries,
    order: view.order,
    region: view.region,
  };
}

export function sameConfig(a: DashboardConfig, b: DashboardConfig): boolean {
  return (
    a.indicator === b.indicator &&
    a.year === b.year &&
    a.order === b.order &&
    (a.region ?? null) === (b.region ?? null) &&
    a.countries.join(",") === b.countries.join(",")
  );
}

/** Why a saved view cannot be shown with the current data, or null if it can. */
export function explainUnavailable(view: SavedView, meta: DashboardMeta): string | null {
  const indicator = meta.indicators.find((i) => i.code === view.indicatorCode);
  if (!indicator) return `its indicator (${view.indicatorCode}) is no longer in the database`;
  if (indicator.yearRange && (view.year < indicator.yearRange.min || view.year > indicator.yearRange.max)) {
    return `${view.year} is outside the data for this indicator (${indicator.yearRange.min}–${indicator.yearRange.max})`;
  }
  const missingCountries = view.countries.filter((code) => !meta.countries.some((c) => c.code === code));
  if (missingCountries.length) {
    return `some countries are no longer in the database (${missingCountries.join(", ")})`;
  }
  if (view.region && !meta.dataSummary.regions.includes(view.region)) {
    return `the region "${view.region}" is no longer in the database`;
  }
  return null;
}

// ---------------------------------------------------------------- queries

const META_QUERY = /* GraphQL */ `
  query DashboardMeta {
    dataSummary {
      regions
    }
    dashboardSummary {
      worldPopulation
      worldPopulationYear
      avgLifeExpectancy
      avgLifeExpectancyYear
      countries
      latestYear
    }
    indicators {
      code
      name
      latestYear
      yearRange {
        min
        max
      }
    }
    countries {
      code
      name
      region
    }
    savedViews(limit: 200) {
      id
      name
      indicatorCode
      year
      countries
      order
      region
      createdAt
    }
  }
`;

const DATA_QUERY = /* GraphQL */ `
  query DashboardData(
    $indicator: String!
    $year: Int!
    $countries: [String!]!
    $order: SortOrder!
    $snapshotIndicators: [String!]!
    $snapshotYear: Int!
  ) {
    observations(indicatorCode: $indicator, countryCodes: $countries) {
      countryCode
      year
      value
    }
    ranking(indicatorCode: $indicator, year: $year, limit: 10, order: $order) {
      value
      country {
        code
        name
        region
      }
    }
    regionAverages(indicatorCode: $indicator, year: $year) {
      region
      regionCode
      average
      countryCount
    }
    countrySnapshot(indicatorCodes: $snapshotIndicators, year: $snapshotYear) {
      country {
        code
        name
        region
      }
      values {
        indicatorCode
        value
      }
    }
  }
`;

export async function fetchDashboardMeta(): Promise<DashboardMeta> {
  return gqlFetch<DashboardMeta>(META_QUERY);
}

export async function fetchDashboardData(params: {
  indicator: string;
  year: number;
  countries: string[];
  order: SortOrder;
  /** Year for the GDP vs life expectancy snapshot (may be earlier than `year`). */
  snapshotYear: number;
}): Promise<DashboardData> {
  return gqlFetch<DashboardData>(DATA_QUERY, {
    ...params,
    snapshotIndicators: [GDP_PER_CAPITA, LIFE_EXPECTANCY, POPULATION],
  });
}
