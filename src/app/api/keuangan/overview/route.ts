import { NextResponse } from "next/server"
import { getOverviewData } from "#@/lib/server/repositories/keuangan.ts"

export async function GET() {
  try {
    const rawData = await getOverviewData();
    
    // Separate income and expense data
    const pemasukanItems = rawData.filter(item => 
      item.name.startsWith('Pemasukan'))
    const pengeluaranItems = rawData.filter(item => 
      item.name.startsWith('Pengeluaran'))

    // Calculate totals
    const totalPemasukan = pemasukanItems.reduce((sum, item) => sum + item.value, 0);
    const totalPengeluaran = pengeluaranItems.reduce((sum, item) => sum + item.value, 0);

    // Format data for charts
    const pemasukanData = pemasukanItems.map(item => ({
      name: item.name.replace('Pemasukan - ', ''),
      value: item.value,
      fill: item.color,
    }));

    const pengeluaranData = pengeluaranItems.map(item => ({
      name: item.name.replace('Pengeluaran - ', ''),
      value: item.value,
      fill: item.color,
    }));

    const overviewData = {
      pemasukanData,
      pengeluaranData,
      totalPemasukan,
      totalPengeluaran,
    };
    return NextResponse.json(overviewData)
  } catch (error) {
    console.error("Error fetching overview data:", error)
    return NextResponse.json({ error: "Failed to fetch overview data" }, { status: 500 })
  }
}
