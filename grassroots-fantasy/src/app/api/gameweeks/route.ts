import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const gameweeks = await prisma.gameweek.findMany({
      orderBy: { number: "asc" },
    });

    return NextResponse.json({ success: true, data: gameweeks });
  } catch (error) {
    console.error("Get gameweeks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch gameweeks" },
      { status: 500 }
    );
  }
}
