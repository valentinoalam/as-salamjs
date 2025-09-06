import { NextResponse } from "next/server"
import type { TransactionType } from "@prisma/client"
import { getTransactions, createTransaction } from "#@/lib/server/repositories/keuangan.ts"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") as TransactionType | undefined
    const categoryId = searchParams.get("categoryId") || undefined
    const searchTerm = searchParams.get("searchTerm") || undefined
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined

    const transactions = await getTransactions(type, categoryId, searchTerm, startDate, endDate)
    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const result = await createTransaction(data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}
