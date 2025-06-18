"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TransactionType } from "@prisma/client"
import { getCurrentUser } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import type { CategoryFormValues, TransactionFormValues, BudgetFormValues } from "@/lib/zod/keuangan"
import type { ChartDataResponse, QurbanSalesStats, TransactionDetail, WeeklySalesData } from "@/types/keuangan"
import type { CategoryDistribution } from "@/types/keuangan"

export async function createCategory(data: CategoryFormValues) {
  try {
    const result = await prisma.transactionCategory.create({
      data,
    })
    revalidatePath("/dashboard/keuangan")
    return { success: true, data: result }
  } catch (error) {
    console.error("Error creating category:", error)
    return { success: false, error: "Failed to create category" }
  }
}

export async function updateCategory(id: number, data: CategoryFormValues) {
  try {
    const result = await prisma.transactionCategory.update({
      where: { id },
      data,
    })
    revalidatePath("/dashboard/keuangan")
    return { success: true, data: result }
  } catch (error) {
    console.error("Error updating category:", error)
    return { success: false, error: "Failed to update category" }
  }
}

export async function deleteCategory(id: number) {
  try {
    // Check if category is used in transactions
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    })

    // Check if category is used in budgets
    const budgetCount = await prisma.budget.count({
      where: { categoryId: id },
    })

    if (transactionCount > 0 || budgetCount > 0) {
      return {
        success: false,
        error: `Cannot delete category that is used in ${transactionCount} transactions and ${budgetCount} budgets`,
      }
    }

    await prisma.transactionCategory.delete({
      where: { id },
    })
    revalidatePath("/dashboard/keuangan")
    return { success: true }
  } catch (error) {
    console.error("Error deleting category:", error)
    return { success: false, error: "Failed to delete category" }
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.transactionCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      }
    })
    return categories.map(category => ({
      id: category.id,
      name: category.name,
      type: category.type,
      trxCount: category._count.transactions,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }))
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw new Error("Failed to fetch categories")
  }
}

export async function createTransaction(data: TransactionFormValues) {
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
        categoryId: data.categoryId,
        date: data.date,
        createdBy: currentUser.id,
      },
    })

    revalidatePath("/dashboard/keuangan")
    return { success: true, transactionId: transaction.id }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return { success: false, error: "Failed to create transaction" }
  }
}

export async function getTransactionStats() {
  const totalIncome = await prisma.transaction.aggregate({
    where: { type: TransactionType.PEMASUKAN },
    _count: { _all: true},
    _sum: { amount: true },
  })

  const qurbanTrx = await prisma.mudhohi.count()

  const totalExpense = await prisma.transaction.aggregate({
    where: { type: TransactionType.PENGELUARAN },
    _count: { _all: true},
    _sum: { amount: true },
  })

  return {
    totalIncome: totalIncome._sum.amount || 0,
    totalExpense: totalExpense._sum.amount || 0,
    incomeTransactionCount: totalIncome._count._all + qurbanTrx,  // Added
    expenseTransactionCount: totalExpense._count._all,
    balance: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0),
  }
}

export async function getTransactions(
  type?: TransactionType,
  categoryId?: string,
  searchTerm?: string,
  startDate?: Date,
  endDate?: Date,
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (type) {
      where.type = type
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (searchTerm) {
      where.OR = [{ description: { contains: searchTerm, mode: "insensitive" } }]
    }

    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    } else if (startDate) {
      where.date = {
        gte: startDate,
      }
    } else if (endDate) {
      where.date = {
        lte: endDate,
      }
    }

    return await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        receiptUrl: {
          select: {
            url: true,
            alt: true
          }
        }
      },
      orderBy: {
        date: "desc",
      },
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return []
  }
}

export async function getLatestTransactions() {
  try {
    return await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      },
      receiptUrl: {
        select: {
          id: true,
          url: true
        }
      }
    },
    take: 10,
  })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return []
  }
}

export async function deleteTransaction(id: string) {
  try {
    await prisma.transaction.delete({
      where: { id },
    })
    revalidatePath("/dashboard/keuangan")
    return { success: true }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return { success: false, error: "Failed to delete transaction" }
  }
}

export async function uploadReceipt(formData: FormData) {
  try {
    const files = formData.getAll("files") as File[]
    const transactionId = formData.get("transactionId") as string

if (!files.length || !transactionId) {
      return { success: false, error: "Missing files or transaction ID" }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public/uploads")
    await mkdir(uploadsDir, { recursive: true })

    const imageUrls = []

    // Process each file
    for (const file of files) {
      // Generate a unique filename
      const uniqueFilename = `${uuidv4()}-${file.name.replace(/\s+/g, "-")}`
      const filePath = join(uploadsDir, uniqueFilename)

      // Convert file to buffer and save it
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      await writeFile(filePath, buffer)
      const imageUrl = `/uploads/${uniqueFilename}`
      imageUrls.push(imageUrl)
    }

    // Update transaction with receipt URLs
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        receiptUrl: {
          createMany: {
            data: imageUrls.map((url) => ({ url })),
          },
        },
      },
    })

    revalidatePath("/keuangan")
    return { success: true,  imageUrls}
  } catch (error) {
    console.error("Error uploading receipt:", error)
    return { success: false, error: "Failed to upload receipt" }
  }
}

// Budget actions
export async function getBudgets() {
  try {
    return await prisma.budget.findMany({
      include: {
        category: true,
      },
      orderBy: {
        startDate: "desc",
      },
    })
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return []
  }
}

export async function createBudget(data: BudgetFormValues) {
  try {
    const result = await prisma.budget.create({
      data: {
        amount: data.amount,
        categoryId: data.categoryId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    })
    revalidatePath("/dashboard/keuangan")
    return { success: true, data: result }
  } catch (error) {
    console.error("Error creating budget:", error)
    return { success: false, error: "Failed to create budget" }
  }
}

export async function updateBudget(id: string, data: BudgetFormValues) {
  try {
    const result = await prisma.budget.update({
      where: { id },
      data: {
        amount: data.amount,
        categoryId: data.categoryId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    })
    revalidatePath("/dashboard/keuangan")
    return { success: true, data: result }
  } catch (error) {
    console.error("Error updating budget:", error)
    return { success: false, error: "Failed to update budget" }
  }
}

export async function deleteBudget(id: string) {
  try {
    await prisma.budget.delete({
      where: { id },
    })
    revalidatePath("/dashboard/keuangan")
    return { success: true }
  } catch (error) {
    console.error("Error deleting budget:", error)
    return { success: false, error: "Failed to delete budget" }
  }
}

export async function calculateSalesStats(tipeHewanId: number): Promise<number> {
  // Get the harga from TipeHewan
  const tipeHewan = await prisma.tipeHewan.findUnique({
    where: { id: tipeHewanId },
    select: { harga: true },
  });
  await prisma.tipeHewan.findUnique({
    where: { id: tipeHewanId },
    select: { harga: true },
  });
  if (!tipeHewan) {
    throw new Error('TipeHewan not found');
  }

  // Count HewanQurban entries associated with this TipeHewan
  const hewanQurbanCount = await prisma.hewanQurban.count({
    where: { tipeId: tipeHewanId },
  });

  // Calculate total sales
  return hewanQurbanCount * tipeHewan.harga;
}

/**
 * Get sales statistics for all TipeHewan types and overall totals
 * @returns SalesReport with individual and total statistics
 */
export async function getQurbanSalesStats(): Promise<QurbanSalesStats> {
  const result = await prisma.$queryRaw<
    Array<{
      tipeid: number;
      nama: string;
      jenis: string;
      harga: number;
      totaldibayarkan: number;
      totalhewan: number;
    }>
  >`
  SELECT
    t.id AS tipeid,
    t.nama,
    t.jenis,
    t.harga,
    COALESCE(SUM(p.dibayarkan), 0) AS totaldibayarkan,
    COUNT(h.id) AS totalhewan
  FROM \`TipeHewan\` t
  LEFT JOIN \`HewanQurban\` h ON t.id = h.\`tipeId\`
  LEFT JOIN \`Pembayaran\` p ON t.id = p.\`tipeid\` AND p.\`paymentStatus\` IN ('LUNAS', 'DOWN_PAYMENT')
  GROUP BY t.id, t.nama, t.jenis, t.harga
  `;

  // Assign the number value safely
  const currentIncome = result.reduce((sum, tipe) => sum + Number(tipe.totaldibayarkan), 0);
  const totalCount = await prisma.mudhohi.count();
  let totalSales = 0;
  let animalCount = 0;
  const perTipeHewan = result.map(tipe => {
    const count = Number(tipe.totalhewan);
    const sales = count * Number(tipe.harga);
    totalSales += sales;
    animalCount += count;
    return {
      tipeHewanId: tipe.tipeid,
      nama: tipe.nama,
      jenis: tipe.jenis,
      harga: tipe.harga,
      count,
      totalAmount: sales,
      currentAmount: tipe.totaldibayarkan
    };
  });

  return { perTipeHewan, animalCount, totalCount, totalSales, currentIncome };

}

export async function getWeeklyAnimalSales(
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1
): Promise<ChartDataResponse> {
  try {
    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Fetch all mudhohi records for the month with related hewan and tipe data
    const mudohiRecords = await prisma.mudhohi.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        hewan: {
          include: {
            tipe: true,
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Get all unique animal types
    const animalTypes = await prisma.tipeHewan.findMany({
      select: {
        nama: true,
      },
      orderBy: {
        nama: 'asc',
      },
    })

    const animalTypeNames = animalTypes.map(type => type.nama)

    // Function to get week number of month
    const getWeekOfMonth = (date: Date): number => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
      const dayOfMonth = date.getDate()
      const dayOfWeek = firstDay.getDay()
      return Math.ceil((dayOfMonth + dayOfWeek) / 7)
    }

    // Group data by week
    const weeklyData = new Map<number, { [key: string]: number }>()

    // Initialize weeks 1-5 for the month
    for (let week = 1; week <= 5; week++) {
      const weekData: { [key: string]: number } = {}
      animalTypeNames.forEach(type => {
        weekData[type] = 0
      })
      weeklyData.set(week, weekData)
    }

    let totalSales = 0
    let totalRevenue = 0
    const transactions: TransactionDetail[] = []

    // Process each mudhohi record
    mudohiRecords.forEach(mudhohi => {
      const weekNumber = getWeekOfMonth(mudhohi.createdAt)
      
      // Calculate transaction details
      const hewanTypeMap = new Map<string, { nama: string; harga: number; count: number }>()
      let transactionTotal = 0

      mudhohi.hewan.forEach(hewan => {
        const animalType = hewan.tipe.nama
        const animalPrice = hewan.tipe.harga
        
        // Update weekly chart data
        const currentWeekData = weeklyData.get(weekNumber)
        if (currentWeekData && animalType) {
          currentWeekData[animalType] = (currentWeekData[animalType] || 0) + 1
          totalSales++
        }

        // Update transaction details
        if (hewanTypeMap.has(animalType)) {
          const existing = hewanTypeMap.get(animalType)!
          existing.count += 1
        } else {
          hewanTypeMap.set(animalType, {
            nama: animalType,
            harga: animalPrice,
            count: 1
          })
        }
        transactionTotal += animalPrice
      })

      totalRevenue += transactionTotal

      // Add to transactions list
      transactions.push({
        id: mudhohi.id,
        nama_pengqurban: mudhohi.nama_pengqurban,
        createdAt: mudhohi.createdAt,
        totalAmount: transactionTotal,
        hewanTypes: Array.from(hewanTypeMap.values()),
        paymentStatus: mudhohi.payment ? 'PAID' : 'PENDING'
      })
    })

    // Convert to chart format
    const chartData: WeeklySalesData[] = []
    
    weeklyData.forEach((data, weekNumber) => {
      const weekData: WeeklySalesData = {
        week: `Week ${weekNumber}`,
        weekNumber,
        ...data,
      }
      chartData.push(weekData)
    })

    // Filter out weeks with no data (for cleaner chart)
    const filteredChartData = chartData.filter(week => {
      const hasData = animalTypeNames.some(type => week[type] as number > 0)
      return hasData || week.weekNumber <= 4 // Always show at least 4 weeks
    })

    return {
      data: filteredChartData,
      animalTypes: animalTypeNames,
      totalSales,
      transactions: transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      totalRevenue,
    }

  } catch (error) {
    console.error('Error fetching qurban weekly sales:', error)
    throw new Error('Failed to fetch qurban weekly sales data')
  } finally {
    await prisma.$disconnect()
  }
}

// Alternative function to get data for a specific date range
export async function getAnimalSalesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<ChartDataResponse> {
  try {
    const mudohiRecords = await prisma.mudhohi.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        hewan: {
          include: {
            tipe: true,
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const animalTypes = await prisma.tipeHewan.findMany({
      select: {
        nama: true,
      },
      orderBy: {
        nama: 'asc',
      },
    })

    const animalTypeNames = animalTypes.map(type => type.nama)

    // Group by week within the date range
    const weeklyData = new Map<string, { [key: string]: number }>()
    let totalSales = 0
    let totalRevenue = 0
    const transactions: TransactionDetail[] = []

    mudohiRecords.forEach(mudhohi => {
      // Get ISO week
      const date = mudhohi.createdAt
      const startOfYear = new Date(date.getFullYear(), 0, 1)
      const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000
      const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7)
      const weekKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`

      if (!weeklyData.has(weekKey)) {
        const weekData: { [key: string]: number } = {}
        animalTypeNames.forEach(type => {
          weekData[type] = 0
        })
        weeklyData.set(weekKey, weekData)
      }

      const currentWeekData = weeklyData.get(weekKey)!
      
      // Calculate transaction details
      const hewanTypeMap = new Map<string, { nama: string; harga: number; count: number }>()
      let transactionTotal = 0
      
      mudhohi.hewan.forEach(hewan => {
        const animalType = hewan.tipe.nama
        const animalPrice = hewan.tipe.harga
        
        if (animalType) {
          currentWeekData[animalType] = (currentWeekData[animalType] || 0) + 1
          totalSales++
        }

        // Update transaction details
        if (hewanTypeMap.has(animalType)) {
          const existing = hewanTypeMap.get(animalType)!
          existing.count += 1
        } else {
          hewanTypeMap.set(animalType, {
            nama: animalType,
            harga: animalPrice,
            count: 1
          })
        }
        transactionTotal += animalPrice
      })

      totalRevenue += transactionTotal

      // Add to transactions list
      transactions.push({
        id: mudhohi.id,
        nama_pengqurban: mudhohi.nama_pengqurban,
        createdAt: mudhohi.createdAt,
        totalAmount: transactionTotal,
        hewanTypes: Array.from(hewanTypeMap.values()),
        paymentStatus: mudhohi.payment ? 'PAID' : 'PENDING'
      })
    })

    // Convert to chart format
    const chartData: WeeklySalesData[] = Array.from(weeklyData.entries())
      .map(([weekKey, data], index) => ({
        week: weekKey,
        weekNumber: index + 1,
        ...data,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))

    return {
      data: chartData,
      animalTypes: animalTypeNames,
      totalSales,
      transactions: transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      totalRevenue,
    }

  } catch (error) {
    console.error('Error fetching qurban sales by date range:', error)
    throw new Error('Failed to fetch qurban sales data')
  } finally {
    await prisma.$disconnect()
  }
}

// Define colors for different categories
const CATEGORY_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#87d068', '#ffb347', '#ff9999', '#87ceeb'
];

export async function getOverviewData(): Promise<CategoryDistribution[]> {
  try {
    // Get all transactions with their categories
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  const totalsByCategoryAndType = new Map<string, number>();

    transactions.forEach(transaction => {
      const categoryName = transaction.category?.name;
      const type = transaction.type;

      if (!categoryName || !type) return;

      const key = `${type}:${categoryName}`;
      const current = totalsByCategoryAndType.get(key) || 0;
      totalsByCategoryAndType.set(key, current + transaction.amount);
    });

    const pieData: CategoryDistribution[] = Array.from(totalsByCategoryAndType.entries())
      .map(([key, value], index) => {
        const [type, name] = key.split(':');
        return {
          name: `${type === 'PENGELUARAN' ? 'Pengeluaran' : 'Pemasukan'} - ${name}`,
          value,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        };
      })
      .sort((a, b) => b.value - a.value);

    return pieData;

  } catch (error) {
    console.error('Error fetching overview data:', error);
    
    // Return empty data structure on error
    return [];
  }
}

// Alternative function to get summary statistics
export async function getOverviewSummary() {
  try {
    // Get current month transactions
    const transactions = await prisma.transaction.findMany();

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.PEMASUKAN)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === TransactionType.PENGELUARAN)
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    // Get transaction count
    const transactionCount = transactions.length;

    return {
      totalIncome,
      totalExpense,
      balance,
      transactionCount,
    };

  } catch (error) {
    console.error('Error fetching overview summary:', error);
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0,
    };
  }
}