import { NextResponse, NextRequest } from 'next/server'
import { JenisHewan } from '@prisma/client'
import prisma from '#@/lib/server/prisma.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

interface HewanMetaData {
  total: number;
  target: number;
  slaughtered: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jenisParam = searchParams.get('jenis')
    let jenis: JenisHewan | undefined

    if (jenisParam) {
      const jenisUpper = jenisParam.toUpperCase()
      if (Object.values(JenisHewan).includes(jenisUpper as JenisHewan)) {
        jenis = jenisUpper as JenisHewan
      } else {
        return NextResponse.json(
          { error: 'Invalid jenis parameter' },
          { status: 400, headers: CORS_HEADERS }
        )
      }
    }

    const tipeHewanData = await prisma.tipeHewan.findMany({
      where: jenis ? { jenis } : {},
      select: {
        id: true,
        nama: true,
        target: true,
        _count: { select: { hewan: true } },
        hewan: {
          where: { slaughtered: true },
          select: { id: true }
        }
      }
    })

    const metaData = tipeHewanData.map(tipe => ({
      typeName: tipe.nama,
      total: tipe._count.hewan,
      target: tipe.target,
      slaughtered: tipe.hewan.length,
    }))

    const formattedMetaData = metaData.reduce<Record<string, HewanMetaData>>(
      (acc, { typeName, ...data }) => {
        acc[typeName] = data
        return acc
      }, {}
    )

    return NextResponse.json(formattedMetaData, {
      status: 200,
      headers: CORS_HEADERS
    })
    
  } catch (error) {
    console.error('Error fetching meta data:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { typeId, target } = body

    if (typeId === undefined || target === undefined) {
      return NextResponse.json(
        { error: "typeId and target are required" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (isNaN(Number(target))) {
      return NextResponse.json(
        { error: "Target must be a number" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    await prisma.tipeHewan.update({
      where: { id: typeId },
      data: { target: Number(target) }
    })

    return NextResponse.json(
      { success: true },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("Error updating target:", error)
    return NextResponse.json(
      { error: "Failed to update target" },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: CORS_HEADERS
  })
}