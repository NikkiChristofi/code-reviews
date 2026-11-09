"use server";

import { revalidatePath } from "next/cache";
import { gqlFetch } from "@/lib/graphql";
import type { DashboardConfig } from "@/lib/dashboard";

export type ActionResult = { ok: true } | { ok: false; error: string };

const CREATE_MUTATION = /* GraphQL */ `
  mutation CreateSavedView($input: SavedViewInput!) {
    createSavedView(input: $input) {
      id
    }
  }
`;

const DELETE_MUTATION = /* GraphQL */ `
  mutation DeleteSavedView($id: Int!) {
    deleteSavedView(id: $id)
  }
`;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

/**
 * Saves the configuration on screen under a name. Errors are returned rather than
 * thrown so the form can show them next to the field.
 */
export async function createSavedViewAction(input: { name: string } & DashboardConfig): Promise<ActionResult> {
  try {
    await gqlFetch(CREATE_MUTATION, {
      input: {
        name: input.name,
        indicatorCode: input.indicator,
        year: input.year,
        countries: input.countries,
        order: input.order,
        region: input.region,
      },
    });
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteSavedViewAction(id: number): Promise<ActionResult> {
  try {
    await gqlFetch(DELETE_MUTATION, { id });
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
}
