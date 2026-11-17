"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSavedView, deleteSavedView, savedViewUrl, type SavedView, type SavedViewConfiguration } from "@/lib/saved-views";

const buttonClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";

export function SavedViews({ selected, views, loadError, activeView }: {
  selected: SavedViewConfiguration;
  views: SavedView[];
  loadError: string | null;
  activeView: SavedView | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [operation, setOperation] = useState<"save" | "delete" | null>(null);
  const busy = isPending || operation !== null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmedName = name.trim();
    setMessage(null);

    if (!trimmedName) {
      setError("Enter a name for this view.");
      return;
    }
    if (trimmedName.length > 60) {
      setError("View names must be 60 characters or fewer.");
      return;
    }
    if (views.some((view) => view.name === trimmedName)) {
      setError("A view with this name already exists. Choose another name.");
      return;
    }

    setError(null);
    setOperation("save");
    try {
      const view = await createSavedView(trimmedName, selected);
      setName("");
      setMessage(`Saved “${view.name}”.`);
      startTransition(() => router.replace(savedViewUrl(view), { scroll: false }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save this view. Please try again.");
    } finally {
      setOperation(null);
    }
  }

  function open(view: SavedView) {
    setError(null);
    setMessage(null);
    startTransition(() => {
      router.push(savedViewUrl(view), { scroll: false });
    });
  }

  async function remove(view: SavedView) {
    if (busy) return;
    if (!window.confirm(`Delete “${view.name}”? This cannot be undone.`)) return;
    setError(null);
    setMessage(null);
    setOperation("delete");
    try {
      await deleteSavedView(view.id);
      setMessage(`Deleted “${view.name}”.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete this view. Please try again.");
    } finally {
      setOperation(null);
    }
  }

  return (
    <section
      aria-labelledby="saved-views-heading"
      aria-busy={busy}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="saved-views-heading" className="text-sm font-medium">Saved views</h2>
        <p className="text-xs text-zinc-500" aria-live="polite">
          {operation === "save" ? "Saving view…" : operation === "delete" ? "Deleting view…" : isPending ? "Loading views…" : activeView ? `Showing saved view: ${activeView.name}` : "Save your current dashboard configuration."}
        </p>
      </div>

      <form onSubmit={save} noValidate className="flex flex-wrap items-end gap-4">
        <label htmlFor="saved-view-name" className="flex w-full flex-col gap-1 text-xs text-zinc-500 sm:w-72">
          View name
          <input
            id="saved-view-name"
            name="viewName"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
              setMessage(null);
            }}
            required
            disabled={busy}
            placeholder="e.g. European GDP comparison"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "saved-view-error" : "saved-view-help"}
            className="min-w-0 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <button type="submit" disabled={busy} className={buttonClass}>{operation === "save" ? "Saving…" : "Save current view"}</button>
      </form>

      <p id="saved-view-help" className="text-xs text-zinc-500">
        Use a unique name of up to 60 characters. Your filters will be saved for later.
      </p>
      {loadError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{loadError}</p>}
      {error && <p id="saved-view-error" role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <p role="status" className="text-xs text-zinc-600 empty:hidden dark:text-zinc-400">{message}</p>

      {loadError ? (
        <button type="button" disabled={busy} onClick={() => startTransition(() => router.refresh())} className={`${buttonClass} self-start`}>Retry loading views</button>
      ) : views.length === 0 ? (
        <p className="text-sm text-zinc-500">No saved views yet. Set your filters, then save a view.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {views.map((view) => (
            <li key={view.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="min-w-0 break-words text-sm">
                {view.name}
                {activeView?.id === view.id && <span className="ml-2 text-xs text-zinc-500">Current view</span>}
              </span>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => open(view)} disabled={busy} aria-label={`Open ${view.name}`} className={buttonClass}>Open</button>
                <button type="button" onClick={() => remove(view)} disabled={busy} aria-label={`Delete ${view.name}`} className={buttonClass}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
