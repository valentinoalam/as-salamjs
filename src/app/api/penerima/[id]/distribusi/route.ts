
import { NextRequest, NextResponse } from "next/server";
import { updateStatsPenerima } from "#@/lib/server/repositories/qurban.ts";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const penerimaId = await params.id;
  
  try {
    const { produkQurban } = await req.json();
    const updatedLog = await updateStatsPenerima({penerimaId, produkDistribusi: produkQurban})
    return NextResponse.json(updatedLog, { status: 200 });
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to update distribution log" },
      { status: 500 }
    );
  }
}