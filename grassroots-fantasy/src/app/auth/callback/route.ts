import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/auth/register";

  // Redirect to client-side handler that processes the hash fragment
  return NextResponse.redirect(`${origin}/auth/confirm?next=${encodeURIComponent(next)}`);
}
