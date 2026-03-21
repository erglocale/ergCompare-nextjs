import { NextRequest, NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { latitude: number; longitude: number };

  const response = await backendFetch("/v1/fleets/get_energy_from_lat_lon", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Failed to fetch energy prices." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
