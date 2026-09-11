export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isAdminUnlocked } from "@/lib/admin-session";

export async function GET() {
  const unlocked = await isAdminUnlocked();
  return NextResponse.json({ success: true, unlocked });
}
