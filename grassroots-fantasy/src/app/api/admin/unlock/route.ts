import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, setAdminCookie } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body.password ?? "");

    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: "Wrong password" },
        { status: 401 }
      );
    }

    await setAdminCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unlock error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not unlock admin" },
      { status: 500 }
    );
  }
}
