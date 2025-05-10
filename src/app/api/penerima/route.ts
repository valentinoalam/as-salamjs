import { type NextRequest, NextResponse } from "next/server"
import { getPenerima, createPenerima } from "@/lib/db"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const distributionId = searchParams.get("distributionId") || undefined
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

  try {
    let data
    if (distributionId) {
      data = await getPenerima(distributionId)
    } else {
      // Manual pagination since we don't have a helper function for this
      data = await prisma.penerima.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
        },
      })
    }

    const total = await prisma.penerima.count()

    return NextResponse.json(data, {
      headers: {
        "X-Total-Count": total.toString(),
        "X-Total-Pages": Math.ceil(total / pageSize).toString(),
      },
    })
  } catch (error) {
    console.error("Error fetching penerima data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const newPenerima = await createPenerima({
      distributionId: body.distributionId,
      noKupon: body.noKupon,
      receivedBy: body.receivedBy,
      institusi: body.institusi,
      noKk: body.noKk,
      alamat: body.alamat,
      phone: body.phone,
      keterangan: body.keterangan,
    })

    return NextResponse.json(newPenerima, { status: 201 })
  } catch (error) {
    console.error("Error creating penerima:", error)
    return NextResponse.json({ error: "Failed to create penerima" }, { status: 500 })
  }
}
