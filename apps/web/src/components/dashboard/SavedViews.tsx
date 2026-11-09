"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { createSavedViewAction, deleteSavedViewAction } from "@/app/dashboard/actions";
import type { DashboardConfig, SavedView } from "@/lib/dashboard";

type Props = {
  views: SavedView[];
  /** The configuration currently on screen; this is what "Save" stores. */
  current: DashboardConfig;
  activeViewId: number | null;
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function SavedViews({ views, current, activeViewId }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSavedViewAction({ name, ...current });
      if (result.ok) setName("");
      else setError(result.error);
    });
  }

  function remove(id: number) {
    setError(null);
    startTransition(async () => {
      const result = await deleteSavedViewAction(id);
      setConfirmId(null);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Saved views</h2>
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} min-w-0 flex-1`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this view, e.g. G7 GDP"
            aria-label="Saved view name"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save current view
          </button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
      </div>

      {views.length === 0 ? (
        <p className="text-sm text-zinc-500">No saved views yet. Set up the dashboard and save it here.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {views.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <Link href={`/dashboard?view=${v.id}`} className="font-medium underline underline-offset-4">
                  {v.name}
                </Link>
                {v.id === activeViewId && <span className="ml-2 text-xs text-zinc-500">(showing)</span>}
                <p className="font-mono text-xs text-zinc-500">
                  {v.indicatorCode} · {v.year} · {v.countries.length} countries
                  {v.region ? ` · ${v.region}` : ""}
                </p>
              </div>

              {confirmId === v.id ? (
                <div className="flex items-center gap-2 text-sm">
                  <span>Delete this view?</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(v.id)}
                    className="rounded-md border border-red-300 px-2 py-1 text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(v.id)}
                  className="text-sm text-zinc-500 hover:text-red-700 dark:hover:text-red-300"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
