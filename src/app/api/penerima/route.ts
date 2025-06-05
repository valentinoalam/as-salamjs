import { type NextRequest, NextResponse } from "next/server"
// import { getPenerima, createPenerima } from "@/services/qurban"
import prisma from "@/lib/prisma"
import type { ProdukDiterima } from "@prisma/client"
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

  const skip = (page - 1) * pageSize

  try {
    const [data, total] = await Promise.all([
      prisma.logDistribusi.findMany({
        include: {
          penerima: true,
          listProduk: {
            include: {
              jenisProduk: true,
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: {
          dibuatPada: "desc",
        },
      }),
      prisma.logDistribusi.count(),
    ])
    console.log(data)
    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("GET /api/log-distribusi error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}


export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    const penerima = await prisma.penerima.create({
      data: {
        distribusiId: data.distribusiId,
        noKupon: data.noKupon,
        diterimaOleh: data.diterimaOleh,
        nama: data.nama,
        noIdentitas: data.noIdentitas,
        alamat: data.alamat,
        telepon: data.telepon,
        keterangan: data.keterangan,
        jenis: data.jenis,
      }
    });

    // Create distribution log
    await prisma.logDistribusi.create({
      data: {
        penerimaId: penerima.id,
        listProduk: {
          createMany: {
            data: data.produkDistribusi.map((item: ProdukDiterima) => ({
              jenisProdukId: item.jenisProdukId,
              jumlahPaket: data.produkDistribusi.reduce((sum: number, item: ProdukDiterima) => sum + item.jumlahPaket, 0),
            })),
          },
        },
      },
    });

    // Update distribution realization
    await prisma.distribusi.update({
      where: { id: data.distribusiId },
      data: { realisasi: { increment: 1 } }
    });

    return NextResponse.json(penerima, { status: 201 });
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to create recipient" },
      { status: 500 }
    );
  }
}