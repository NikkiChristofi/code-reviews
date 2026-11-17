"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { MAX_COUNTRIES, type CountryMeta, type IndicatorMeta, type SortOrder } from "@/lib/dashboard";
import { shortIndicatorName } from "@/lib/format";

type Props = {
  indicators: IndicatorMeta[];
  countries: CountryMeta[];
  regions: string[];
  selected: {
    indicator: string;
    year: number;
    countries: string[];
    order: SortOrder;
    region: string | null;
  };
  yearOptions: number[];
};

const selectClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/**
 * Every control writes to the URL query string; the server component re-renders
 * with the new parameters. Nothing is stored in component state.
 */
export function Controls({ indicators, countries, regions, selected, yearOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("view");
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  const addable = countries.filter((c) => !selected.countries.includes(c.code));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Indicator
          <select
            className={selectClass}
            value={selected.indicator}
            // Changing indicator clears the year so the indicator's latest year is used.
            onChange={(e) => update({ indicator: e.target.value, year: null })}
          >
            {indicators.map((i) => (
              <option key={i.code} value={i.code}>
                {shortIndicatorName(i.code, i.name)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Year
          <select className={selectClass} value={selected.year} onChange={(e) => update({ year: e.target.value })}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Ranking
          <select className={selectClass} value={selected.order} onChange={(e) => update({ order: e.target.value })}>
            <option value="DESC">Highest first</option>
            <option value="ASC">Lowest first</option>
          </select>
        </label>

        <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs text-zinc-500">
          Highlight region
          <select
            className={`${selectClass} max-w-full`}
            value={selected.region ?? ""}
            onChange={(e) => update({ region: e.target.value || null })}
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Countries</span>
        {selected.countries.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs dark:border-zinc-700"
          >
            {countryName(code)}
            <button
              type="button"
              aria-label={`Remove ${countryName(code)}`}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => update({ countries: selected.countries.filter((c) => c !== code).join(",") })}
            >
              ×
            </button>
          </span>
        ))}
        {selected.countries.length < MAX_COUNTRIES && (
          <select
            className={`${selectClass} py-0.5 text-xs`}
            value=""
            aria-label="Add country"
            onChange={(e) => e.target.value && update({ countries: [...selected.countries, e.target.value].join(",") })}
          >
            <option value="">+ Add country…</option>
            {addable.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {selected.countries.length >= MAX_COUNTRIES && (
          <span className="text-xs text-zinc-400">Maximum of {MAX_COUNTRIES} countries</span>
        )}
      </div>
    </div>
  );
}
