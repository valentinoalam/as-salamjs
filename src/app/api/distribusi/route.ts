import { NextRequest, NextResponse } from "next/server";
import prisma from "#@/lib/server/prisma.ts";
import { getDistribution } from "#@/lib/server/repositories/qurban.ts"

export async function GET() {
  try {
    const data = await getDistribution()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching distributions:", error)
    return NextResponse.json({ error: "Failed to fetch distributions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { kategori, target } = await req.json();
    
    const distribusi = await prisma.distribusi.create({
      data: {
        kategori,
        target,
        realisasi: 0
      }
    });

    return NextResponse.json(distribusi, { status: 201 });
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to create distribution" },
      { status: 500 }
    );
  }
}