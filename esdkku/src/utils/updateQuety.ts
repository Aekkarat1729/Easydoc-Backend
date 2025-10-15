"use client"

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export function updateQuery(
  router: AppRouterInstance,
  pathname: string,
  searchParams: URLSearchParams,
  updates: Record<string, string | null>
) {
  const params = new URLSearchParams(searchParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  router.push(`${pathname}?${params.toString()}`);
}