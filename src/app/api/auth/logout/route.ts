import { NextResponse } from "next/server";

import { getAccessTokenCookieName } from "@/lib/auth";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3007")
  );
  response.cookies.delete(getAccessTokenCookieName());
  return response;
}