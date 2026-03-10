import { NextRequest, NextResponse } from "next/server";

import { getAccessTokenCookieName, getBackendUrl } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const backendUrl = getBackendUrl();
  const backendRes = await fetch(`${backendUrl}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: data.message ?? "Authentication failed." },
      { status: backendRes.status }
    );
  }

  const response = NextResponse.json({ success: true, user: data.user });

  response.cookies.set(getAccessTokenCookieName(), data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours, matches backend JWT expiry
  });

  return response;
}