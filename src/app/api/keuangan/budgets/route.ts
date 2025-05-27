import { NextResponse } from "next/server"
import { getBudgets, createBudget } from "@/services/keuangan"

export async function GET() {
  try {
    const budgets = await getBudgets()
    return NextResponse.json(budgets)
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const result = await createBudget(data)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating budget:", error)
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 })
  }
}
