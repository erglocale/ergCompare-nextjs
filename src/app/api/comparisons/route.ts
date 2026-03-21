import { NextRequest, NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";
import {
  fetchDashboardComparisons,
  type ComparisonFormPayload,
} from "@/lib/comparisons";

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Report ID is required." }, { status: 400 });
  }

  try {
    const res = await backendFetch(`/v1/report/${id}`, { method: "DELETE" });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Failed to delete comparison." },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Failed to delete comparison." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const comparisons = await fetchDashboardComparisons();
    return NextResponse.json({ comparisons });
  } catch {
    return NextResponse.json({ message: "Failed to load comparisons." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ComparisonFormPayload;

  try {
    const response = await backendFetch("/v1/comparison/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      return NextResponse.json(
        { message: "Failed to calculate comparison.", details: bodyText || null },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Failed to calculate comparison." },
      { status: 500 }
    );
  }
}
