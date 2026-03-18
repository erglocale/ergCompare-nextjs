import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
  picture?: string | null;
  status: string;
  role: string;
};

type AuthSession = {
  user: AuthUser;
  accessToken: string;
};

const ACCESS_TOKEN_COOKIE = "ergcompare_access_token";

export function getBackendUrl() {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_BACKEND_URL");
  }
  return url;
}

export function getAccessTokenCookieName() {
  return ACCESS_TOKEN_COOKIE;
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${getBackendUrl()}/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Backend auth check failed with status ${response.status}`);
  }

  const data = (await response.json()) as { user: AuthUser };
  return { user: data.user, accessToken };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }
}
