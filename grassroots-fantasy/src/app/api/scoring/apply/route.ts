import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  return NextResponse.redirect(new URL("/api/admin/scoring/apply", _request.url), { status: 307 });
}
