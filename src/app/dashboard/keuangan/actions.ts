"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { TransactionType, type TransactionCategory } from "@prisma/client"
import { getCurrentUser } from "@/lib/auth"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export async function getTransactionStats() {
  const totalIncome = await prisma.transaction.aggregate({
    where: { type: TransactionType.PEMASUKAN },
    _sum: { amount: true },
  })

  const totalExpense = await prisma.transaction.aggregate({
    where: { type: TransactionType.PENGELUARAN },
    _sum: { amount: true },
  })

  return {
    totalIncome: totalIncome._sum.amount || 0,
    totalExpense: totalExpense._sum.amount || 0,
    balance: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0),
  }
}

export async function getTransactions(type?: TransactionType, category?: TransactionCategory, searchTerm?: string) {
  const where: any = {}

  if (type) {
    where.type = type
  }

  if (category) {
    where.category = category
  }

  if (searchTerm) {
    where.OR = [{ description: { contains: searchTerm } }]
  }

  return await prisma.transaction.findMany({
    where,
    orderBy: {
      date: "desc",
    },
  })
}

export async function createTransaction(data: {
  amount: number
  description: string
  type: TransactionType
  category: TransactionCategory
  date: Date
}) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { success: false, error: "User not authenticated" }
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: data.amount,
        description: data.description,
        type: data.type,
        category: data.category,
        date: data.date,
        createdBy: currentUser.id as string,
      },
    })

    revalidatePath("/keuangan")
    return { success: true, transactionId: transaction.id }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return { success: false, error: "Failed to create transaction" }
  }
}

export async function uploadReceipt(formData: FormData) {
  try {
    const file = formData.get("file") as File
    const transactionId = formData.get("transactionId") as string

    if (!file || !transactionId) {
      return { success: false, error: "Missing file or transaction ID" }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public/uploads")

    // Generate a unique filename
    const uniqueFilename = `${uuidv4()}-${file.name}`
    const filePath = join(uploadsDir, uniqueFilename)

    // Convert file to buffer and save it
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    await writeFile(filePath, buffer)

    // Update transaction with receipt URL
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        receiptUrl: `/uploads/${uniqueFilename}`,
      },
    })

    revalidatePath("/keuangan")
    return { success: true }
  } catch (error) {
    console.error("Error uploading receipt:", error)
    return { success: false, error: "Failed to upload receipt" }
  }
}
