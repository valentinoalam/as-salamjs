// app/api/hewan/meta/route.ts
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Ambil query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    // Query database
    const tipeHewanList = await prisma.tipeHewan.findMany({
      where: type ? { nama: type } : {},
      select: {
        id: true,
        nama: true,
        target: true,
        _count: {
          select: { hewan: true }
        }
      }
    })

    // Format response
    const metaData = tipeHewanList.map(tipe => ({
      typeId: tipe.id,
      typeName: tipe.nama,
      target: tipe.target,
      total: tipe._count.hewan
    }))

    return NextResponse.json(metaData, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('Error fetching meta data:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Handle preflight CORS requests
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}