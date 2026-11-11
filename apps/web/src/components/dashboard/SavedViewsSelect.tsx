"use client";

import { usePathname, useRouter } from "next/navigation";
import { isSameSelection, selectionToSearchParams, type DashboardSelection, type SavedView } from "@/lib/dashboard";

type Props = {
  views: SavedView[];
  /** The dashboard's current selections, used to show which saved view (if any) is active. */
  current: DashboardSelection;
};

/**
 * Dropdown of saved views. Choosing one navigates to the dashboard URL for its
 * selections; the server component then renders that view.
 */
export function SavedViewsSelect({ views, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const active = views.find((v) => isSameSelection(v, current));

  function handleChange(id: string) {
    const view = views.find((v) => String(v.id) === id);
    if (!view) return;
    router.push(`${pathname}?${selectionToSearchParams(view).toString()}`, { scroll: false });
  }

  return (
    <select
      aria-label="Saved views"
      className="max-w-56 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      value={active ? String(active.id) : ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={views.length === 0}
    >
      <option value="" disabled>
        {views.length === 0 ? "No saved views" : "Saved views…"}
      </option>
      {views.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}
