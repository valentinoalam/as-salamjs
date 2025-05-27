import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { JenisHewan } from '@prisma/client'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/prisma'


type HewanMetaData = {
  total: number;
  target: number;
  slaughtered: number;
};
interface MetaDataMap {
  [typeName: string]: HewanMetaData; // Index signature
}
export async function GET(request: NextRequest) {
  try {
    // Ambil query parameters
    const { searchParams } = new URL(request.url)
    const jenis = searchParams.get('jenis')

    let enumJenis: JenisHewan | undefined;
    if (jenis) {
      // 1. Convert the input string to uppercase for case-insensitive matching.
      const upperCaseJenis = jenis.toUpperCase();

      // 2. Check if the uppercase string is a valid member of the JenisHewan enum.
      //    Object.values(JenisHewan) gives you an array of all enum string values.
      if (Object.values(JenisHewan).includes(upperCaseJenis as JenisHewan)) {
        enumJenis = upperCaseJenis as JenisHewan;
      } else {
        enumJenis = undefined;
      }
    }
    // Query database
    const tipeHewanList = await prisma.tipeHewan.findMany({
      where: enumJenis !== undefined ? { jenis: enumJenis } : {},
      select: {
        id: true,
        nama: true,
        target: true,
        _count: {
          select: { hewan: true} 
        }
      }
    })

    // Format response
    const metaData = await Promise.all(
      tipeHewanList.map(async (tipe) => {
        const slaughteredCount = await prisma.hewanQurban.count({
          where: {
            tipeId: tipe.id, // Use the correct foreign key name
            slaughtered: true,
          },
        });

        return {
          typeId: tipe.id,
          typeName: tipe.nama,
          target: tipe.target,
          total: tipe._count.hewan, // This is the count from the initial findMany
          slaughtered: slaughteredCount, // This is the specific count you just fetched
        };
      })
    );
    const formattedMetaData: Record<string, HewanMetaData> = metaData.reduce((acc: MetaDataMap, hewan) => {
      acc[hewan.typeName] = {
        total: hewan.total,
        target: hewan.target,
        slaughtered: hewan.slaughtered,
      };
      return acc;
    }, {});

    return NextResponse.json(formattedMetaData, {
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, increment, decrement, field } = body

    if (!type || !field) {
      return NextResponse.json({ error: "Type and field are required" }, { status: 400 })
    }

    // Meta updates are handled by the actual database operations
    // This endpoint is mainly for triggering cache invalidation
    // The actual counts are calculated in real-time from the database

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating meta:", error)
    return NextResponse.json({ error: "Failed to update meta data" }, { status: 500 })
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