import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const university = await prisma.university.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!university) {
      return NextResponse.json(
        { success: false, error: "University not found" },
        { status: 404 }
      );
    }

    const faculties = await prisma.faculty.findMany({
      where: { universityId: university.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: { faculties } });
  } catch (error) {
    console.error("Error fetching faculties:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
