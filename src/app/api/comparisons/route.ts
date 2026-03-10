import { NextRequest, NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend";
import {
  buildDashboardComparison,
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

  const defaultProjectResponse = await backendFetch("/v1/project/default");
  if (!defaultProjectResponse.ok) {
    return NextResponse.json(
      { message: "Failed to resolve the default project." },
      { status: defaultProjectResponse.status }
    );
  }

  const defaultProject = (await defaultProjectResponse.json()) as { id: number };
  const reportName = payload.comparisonName.trim() || "Untitled Comparison";

  const createReportResponse = await backendFetch("/v1/report", {
    method: "POST",
    body: JSON.stringify({
      name: reportName,
      project: defaultProject.id,
      type: "comparison",
      s3: "",
      json: {
        input: payload,
        output: null,
      },
    }),
  });

  if (!createReportResponse.ok) {
    return NextResponse.json(
      { message: "Failed to create the comparison report." },
      { status: createReportResponse.status }
    );
  }

  const report = await createReportResponse.json();
  const detailResponse = await backendFetch(`/v1/report/${report.id}`);
  if (!detailResponse.ok) {
    return NextResponse.json({ report });
  }

  const details = await detailResponse.json();
  return NextResponse.json({ report, comparison: buildDashboardComparison(details) });
}