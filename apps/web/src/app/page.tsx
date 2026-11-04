import Link from "next/link";
import { gqlFetch, getGraphqlUrl } from "@/lib/graphql";

// Always render on request so the page reflects the current DB contents.
export const dynamic = "force-dynamic";

type Greeting = {
  id: number;
  message: string;
  createdAt: string;
};

type Indicator = {
  code: string;
  name: string;
  observationCount: number;
  yearRange: { min: number; max: number } | null;
};

type HomeData = {
  hello: string;
  greetings: Greeting[];
  savedViews: { id: number; name: string; url: string; createdAt: string }[];
  dataSummary: {
    countries: number;
    indicators: number;
    observations: number;
    regions: string[];
    incomeLevels: string[];
    lastIngestedAt: string | null;
  };
  indicators: Indicator[];
};

const HOME_QUERY = /* GraphQL */ `
  query Home {
    hello
    greetings {
      id
      message
      createdAt
    }
    dataSummary {
      countries
      indicators
      observations
      regions
      incomeLevels
      lastIngestedAt
    }
    indicators {
      code
      name
      observationCount
      yearRange {
        min
        max
      }
    }
    savedViews {
      id
      name
      url
      createdAt
    }
  }
`;

async function loadHome(): Promise<
  { ok: true; data: HomeData } | { ok: false; error: string }
> {
  try {
    const data = await gqlFetch<HomeData>(HOME_QUERY);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const number = new Intl.NumberFormat("en-GB");

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/60">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default async function Home() {
  const result = await loadHome();

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Code Reviews
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {result.ok ? result.data.hello : "Hello, World!"}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Next.js frontend → GraphQL API → Node backend → SQLite via Prisma.
        </p>
      </header>

      {!result.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Could not reach the GraphQL API.</p>
          <p className="mt-1 font-mono text-xs">{result.error}</p>
          <p className="mt-2">
            Expected it at <code className="font-mono">{getGraphqlUrl()}</code>. Is the API
            running?
          </p>
        </div>
      )}

      {result.ok && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-medium">World Bank dataset</h2>
            <span className="text-xs text-zinc-500">
              {result.data.dataSummary.lastIngestedAt
                ? `Ingested ${new Date(result.data.dataSummary.lastIngestedAt).toLocaleString("en-GB")}`
                : "Not ingested yet"}
            </span>
          </div>

          {result.data.dataSummary.observations === 0 ? (
            <p className="text-zinc-500">
              No data yet. Run <code className="font-mono">npm run db:ingest</code>.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Countries" value={number.format(result.data.dataSummary.countries)} />
                <Stat label="Indicators" value={number.format(result.data.dataSummary.indicators)} />
                <Stat
                  label="Observations"
                  value={number.format(result.data.dataSummary.observations)}
                />
              </div>

              <table className="mt-6 w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="pb-2 font-medium">Indicator</th>
                    <th className="pb-2 text-right font-medium">Years</th>
                    <th className="pb-2 text-right font-medium">Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {result.data.indicators.map((ind) => (
                    <tr key={ind.code}>
                      <td className="py-2 pr-4">
                        <div>{ind.name}</div>
                        <div className="font-mono text-xs text-zinc-500">{ind.code}</div>
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-zinc-500">
                        {ind.yearRange ? `${ind.yearRange.min}–${ind.yearRange.max}` : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {number.format(ind.observationCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  {result.data.dataSummary.regions.length} regions ·{" "}
                  {result.data.dataSummary.incomeLevels.length} income levels
                </span>
                <Link href="/dashboard" className="font-medium underline underline-offset-4">
                  Open the dashboard →
                </Link>
              </p>
            </>
          )}
        </section>
      )}

      {result.ok && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-medium">Saved views</h2>
            <span className="text-xs text-zinc-500">
              {result.data.savedViews.length === 0
                ? "None yet"
                : result.data.savedViews.length === 1
                  ? "1 saved view"
                  : result.data.savedViews.length > 5
                    ? "Showing 5 of " + result.data.savedViews.length
                    : result.data.savedViews.length + " saved views"}
            </span>
          </div>
          {result.data.savedViews.length === 0 ? (
            <p className="text-zinc-500">Save a configuration from the dashboard and it will show up here.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {result.data.savedViews.slice(0, 5).map((v) => (
                <li key={v.id} className="flex items-baseline justify-between gap-4 py-2">
                  <Link href={v.url} className="underline underline-offset-4">
                    {v.name}
                  </Link>
                  <time dateTime={v.createdAt} className="shrink-0 font-mono text-xs text-zinc-500">
                    {new Date(v.createdAt).toLocaleDateString("en-GB")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {result.ok && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-medium">Greetings from the database</h2>
          {result.data.greetings.length === 0 ? (
            <p className="text-zinc-500">
              No greetings yet. Run <code className="font-mono">npm run db:seed</code>.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {result.data.greetings.map((g) => (
                <li key={g.id} className="flex items-baseline justify-between gap-4 py-2">
                  <span>{g.message}</span>
                  <time
                    dateTime={g.createdAt}
                    className="shrink-0 font-mono text-xs text-zinc-500"
                  >
                    {new Date(g.createdAt).toLocaleString("en-GB")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="text-sm text-zinc-500">
        GraphiQL playground:{" "}
        <a
          className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
          href="http://localhost:4000/graphql"
          target="_blank"
          rel="noreferrer"
        >
          http://localhost:4000/graphql
        </a>
      </footer>
    </main>
  );
}
