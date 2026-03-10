import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getAccessTokenCookieName, getBackendUrl } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAccessTokenCookieName())?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json()) as {
    current_password?: string;
    new_password?: string;
  };

  if (!body.current_password || !body.new_password) {
    return NextResponse.json(
      { error: "Current and new passwords are required." },
      { status: 400 }
    );
  }

  const backendUrl = getBackendUrl();
  const backendRes = await fetch(`${backendUrl}/v1/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: body.current_password,
      new_password: body.new_password,
    }),
    cache: "no-store",
  });

  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: data.message ?? "Failed to change password." },
      { status: backendRes.status }
    );
  }

  return NextResponse.json({ success: true, message: data.message });
}
