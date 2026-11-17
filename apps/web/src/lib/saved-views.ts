import type { DashboardParams } from "@/lib/dashboard";
import { gqlFetch } from "@/lib/graphql";

export type SavedViewConfiguration = DashboardParams & { year: number };
export type SavedView = SavedViewConfiguration & {
  id: number;
  name: string;
  createdAt: string;
};

const FIELDS = "id name indicator year countries order region createdAt";

export function configurationQuery(configuration: SavedViewConfiguration): string {
  const query = new URLSearchParams({
    indicator: configuration.indicator,
    year: String(configuration.year),
    countries: configuration.countries.join(","),
    order: configuration.order,
  });
  if (configuration.region) query.set("region", configuration.region);
  return query.toString();
}

export function savedViewUrl(view: SavedView): string {
  return `/dashboard?${configurationQuery(view)}&view=${view.id}`;
}

export async function fetchSavedViews(): Promise<SavedView[]> {
  const data = await gqlFetch<{ savedViews: SavedView[] }>(`query SavedViews { savedViews { ${FIELDS} } }`);
  return data.savedViews;
}

export async function createSavedView(name: string, configuration: SavedViewConfiguration): Promise<SavedView> {
  const data = await gqlFetch<{ createSavedView: SavedView }>(
    `mutation CreateSavedView($input: CreateSavedViewInput!) { createSavedView(input: $input) { ${FIELDS} } }`,
    { input: { name, ...configuration } },
  );
  return data.createSavedView;
}

export async function deleteSavedView(id: number): Promise<void> {
  await gqlFetch<{ deleteSavedView: boolean }>(
    "mutation DeleteSavedView($id: Int!) { deleteSavedView(id: $id) }",
    { id },
  );
}
