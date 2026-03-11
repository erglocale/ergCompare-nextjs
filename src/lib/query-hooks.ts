"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ComparisonFormPayload, DashboardComparison } from "@/lib/comparisons";
import type { EvCatalogItem } from "@/lib/mock-data";

export function useEvCatalogQuery(
  search?: string,
  latitude?: number,
  longitude?: number
) {
  return useQuery({
    queryKey: ["ev-catalog", search ?? "", latitude ?? null, longitude ?? null],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeof latitude === "number") params.set("latitude", String(latitude));
      if (typeof longitude === "number") params.set("longitude", String(longitude));
      const qs = params.toString();
      const url = qs ? `/api/ev-catalog?${qs}` : "/api/ev-catalog";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load EV catalog.");
      }
      const data = (await response.json()) as EvCatalogItem[];
      return data.sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useComparisonsQuery() {
  return useQuery({
    queryKey: ["comparisons"],
    queryFn: async () => {
      const response = await fetch("/api/comparisons", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load comparisons.");
      }
      const data = (await response.json()) as { comparisons: DashboardComparison[] };
      return data.comparisons;
    },
  });
}

export function useCreateComparisonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ComparisonFormPayload) => {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(error?.message || "Failed to create comparison.");
      }

      return (await response.json()) as {
        report: { id: number };
        comparison?: DashboardComparison;
      };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["comparisons"] });
    },
  });
}

export function useDeleteComparisonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: number | string) => {
      const response = await fetch(`/api/comparisons?id=${reportId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(error?.message || "Failed to delete comparison.");
      }

      return (await response.json()) as { success: boolean };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["comparisons"] });
    },
  });
}