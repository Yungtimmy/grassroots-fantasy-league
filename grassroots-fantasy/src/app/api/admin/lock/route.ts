export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin-session";

export async function POST() {
  await clearAdminCookie();
  return NextResponse.json({ success: true });
}
