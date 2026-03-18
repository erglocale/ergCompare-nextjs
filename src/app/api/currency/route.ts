import { NextRequest, NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const queryString = searchParams.toString();
  const path = queryString ? `/v1/currency?${queryString}` : "/v1/currency";

  const response = await backendFetch(path);
  if (!response.ok) {
    return NextResponse.json(
      { message: "Failed to load currency data." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
