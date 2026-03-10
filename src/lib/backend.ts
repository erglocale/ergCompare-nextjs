import "server-only";

import { cookies } from "next/headers";

import { getAccessTokenCookieName, getBackendUrl } from "@/lib/auth";

export async function getBackendAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(getAccessTokenCookieName())?.value ?? null;
}

export async function backendFetch(path: string, init?: RequestInit) {
  const accessToken = await getBackendAccessToken();
  const backendUrl = getBackendUrl();

  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}