export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const universities = await prisma.university.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        logo: true,
        state: true,
        country: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { universities },
    });
  } catch (error) {
    console.error("Get universities error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
