export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { recomputeActionLog, summarizeGameweekRecompute } from "@/lib/recompute-admin";
import {
  ScoringError,
  previewSeasonRecompute,
  recomputeAllStoredPoints,
} from "@/lib/scoring";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const confirm = body?.confirm === true;
    const report = await previewSeasonRecompute({ gameweek: params.id });
    const summary = summarizeGameweekRecompute(report, params.id);

    if (!summary.ok) {
      console.log(recomputeActionLog({ confirm, written: false, ...summary }));
      return NextResponse.json(
        {
          success: false,
          error: summary.reason ?? "Gameweek has no lineup snapshot",
          data: { ...summary, written: false },
        },
        { status: 409 },
      );
    }

    if (!confirm) {
      console.log(recomputeActionLog({ confirm, written: false, ...summary }));
      return NextResponse.json({ success: true, data: { ...summary, written: false } });
    }

    await recomputeAllStoredPoints({ gameweek: params.id });
    console.log(recomputeActionLog({ confirm, written: true, ...summary }));
    return NextResponse.json({ success: true, data: { ...summary, written: true } });
  } catch (error) {
    console.error("Recompute points error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof ScoringError
      ? error.status
      : message === "Forbidden"
        ? 403
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
