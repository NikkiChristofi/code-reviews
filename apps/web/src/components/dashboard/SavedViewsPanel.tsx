"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SavedView } from "@/lib/dashboard";

type Props = {
  views: SavedView[];
  activeId: number | null;
  current: {
    ind: string;
    yr: number;
    ctry: string[];
    ord: string;
    rgn: string | null;
  };
};

export function SavedViewsPanel({ views, activeId, current }: Props) {
  const router = useRouter();
  const [nm, setNm] = useState("");
  const [busy, setBusy] = useState(false);

  async function doIt(q: string, v: Record<string, unknown>) {
    const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL as string, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: q, variables: v }),
    });
    const json = await res.json();
    if (json.errors) {
      alert(json.errors[0].message);
      return false;
    }
    return true;
  }

  async function handleStuff() {
    setBusy(true);
    const ok = await doIt(
      `mutation ($name: String!, $ind: String!, $yr: Int, $ctry: String!, $ord: String, $rgn: String) {
        SaveView(name: $name, ind: $ind, yr: $yr, ctry: $ctry, ord: $ord, rgn: $rgn) { id }
      }`,
      { name: nm, ind: current.ind, yr: current.yr, ctry: current.ctry.join(","), ord: current.ord, rgn: current.rgn },
    );
    if (ok) {
      setNm("");
      router.refresh();
    }
    setBusy(false);
  }

  async function del(v: SavedView) {
    if (confirm("Delete " + v.name + "?")) {
      const ok = await doIt(`mutation ($id: Int!) { deleteSavedView(id: $id) }`, { id: v.id });
      if (ok) {
        router.refresh();
      }
    }
  }

  const activeName = views.find((v) => v.id === activeId)?.name;
  const status =
    activeId != null
      ? 'Showing "' + activeName + '"'
      : views.length == 0
        ? "No saved views yet. Save the current configuration below."
        : "Current configuration is not saved";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium">Saved views</h2>
        <span className="text-xs text-zinc-500">{status}</span>
      </div>

      {views.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {views.map((v) => (
            <li
              key={v.id}
              className={
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs " +
                (v.id === activeId
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700")
              }
            >
              <Link href={v.url}>{v.name}</Link>
              <button
                type="button"
                aria-label={"Delete " + v.name}
                className="opacity-60 hover:opacity-100"
                onClick={() => del(v)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleStuff();
        }}
      >
        <input
          className="w-64 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Name this view…"
          value={nm}
          onChange={(e) => setNm(e.target.value)}
          maxLength={60}
        />
        <button
          type="submit"
          disabled={busy || nm.length == 0}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Saving…" : "Save current view"}
        </button>
      </form>
    </div>
  );
}
