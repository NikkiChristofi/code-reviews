"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveDashboardView, type DashboardSelection } from "@/lib/dashboard";

type Status =
  | { kind: "idle" }
  | { kind: "naming" }
  | { kind: "saving" }
  | { kind: "saved"; name: string }
  | { kind: "error"; message: string };

const MAX_NAME_LENGTH = 80;

/**
 * Asks for a name, then saves the dashboard's current selections via the
 * GraphQL API and refreshes the page so the saved views dropdown includes it.
 */
export function SaveViewButton({ selection }: { selection: DashboardSelection }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [name, setName] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStatus({ kind: "saving" });
    try {
      await saveDashboardView({ ...selection, name: trimmed });
      setStatus({ kind: "saved", name: trimmed });
      setName("");
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  const showForm = status.kind === "naming" || status.kind === "saving" || status.kind === "error";

  return (
    <div className="flex flex-col items-end gap-1">
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            aria-label="View name"
            placeholder="Name this view"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setStatus({ kind: "idle" })}
            disabled={status.kind === "saving"}
            className="w-48 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={status.kind === "saving" || !name.trim()}
            className={primaryButton}
          >
            {status.kind === "saving" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            disabled={status.kind === "saving"}
            className="rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setStatus({ kind: "naming" })} className={primaryButton}>
          Save view
        </button>
      )}
      <p aria-live="polite" className="min-h-4 text-xs">
        {status.kind === "saved" && (
          <span className="text-emerald-600 dark:text-emerald-400">Saved “{status.name}”</span>
        )}
        {status.kind === "error" && <span className="text-red-600 dark:text-red-400">{status.message}</span>}
      </p>
    </div>
  );
}

const primaryButton =
  "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
