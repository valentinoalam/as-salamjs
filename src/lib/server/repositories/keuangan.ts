"use server"

import prisma from "#@/lib/server/prisma.ts"
import { revalidatePath } from "next/cache"
import { TransactionType } from "@prisma/client"
import { getCurrentUser } from "#@/lib/utils/auth.ts"
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
/**
 * Alternative implementation using Prisma ORM
 * Get sales statistics for all TipeHewan types and overall totals
 * @returns QurbanSalesStats with individual and total statistics
 */
export async function getQurbanSalesStats(): Promise<QurbanSalesStats> {
  // Get all TipeHewan with their related data
  const tipeHewanData = await prisma.tipeHewan.findMany({
    include: {
      hewan: {
        include: {
          mudhohi: {
            include: {
              payment: {
                where: {
                  paymentStatus: {
                    in: ['LUNAS', 'DOWN_PAYMENT']
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  // Get total mudhohi count
  const totalCount = await prisma.mudhohi.count();

  let totalSales = 0;
  let animalCount = 0;
  let currentIncome = 0;

  const perTipeHewan = tipeHewanData.map(tipe => {
    const count = tipe.hewan.length;
    const sales = count * tipe.harga;
    
    // Calculate current income for this tipe
    const currentAmount = tipe.hewan.reduce((sum, hewan) => {
      return sum + hewan.mudhohi.reduce((mudhohiSum, mudhohi) => {
        return mudhohiSum + (mudhohi.payment?.dibayarkan || 0);
      }, 0);
    }, 0);

    totalSales += sales;
    animalCount += count;
    currentIncome += currentAmount;

    return {
      tipeHewanId: tipe.id,
      nama: tipe.nama,
      jenis: tipe.jenis,
      harga: tipe.harga,
      count,
      totalAmount: sales,
      currentAmount
    };
  });

  return {
    perTipeHewan,
    animalCount,
    totalCount,
    totalSales,
    currentIncome
  };
}

/**
 * Combined function to get both overall stats and date-range specific data
 * More efficient as it reduces database calls and reuses computations
 */
export async function getCombinedSalesAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  overallStats: QurbanSalesStats;
  weeklyData?: ChartDataResponse;
}> {
  try {
    // Base query for overall stats - get all data
    const allTipeHewanData = await prisma.tipeHewan.findMany({
      include: {
        hewan: {
          include: {
            mudhohi: {
              include: {
                payment: {
                  where: {
                    paymentStatus: {
                      in: ['LUNAS', 'DOWN_PAYMENT']
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        nama: 'asc'
      }
    });

    // Get total mudhohi count
    const totalCount = await prisma.mudhohi.count();

    // Calculate overall stats
    let totalSales = 0;
    let animalCount = 0;
    let currentIncome = 0;

    const perTipeHewan = allTipeHewanData.map(tipe => {
      const count = tipe.hewan.length;
      const sales = count * tipe.harga;
      
      // Calculate current income for this tipe
      const currentAmount = tipe.hewan.reduce((sum, hewan) => {
        return sum + hewan.mudhohi.reduce((mudhohiSum, mudhohi) => {
          return mudhohiSum + (mudhohi.payment?.dibayarkan || 0);
        }, 0);
      }, 0);

      totalSales += sales;
      animalCount += count;
      currentIncome += currentAmount;

      return {
        tipeHewanId: tipe.id,
        nama: tipe.nama,
        jenis: tipe.jenis,
        harga: tipe.harga,
        count,
        totalAmount: sales,
        currentAmount
      };
    });

    const overallStats: QurbanSalesStats = {
      perTipeHewan,
      animalCount,
      totalCount,
      totalSales,
      currentIncome
    };

    // If date range is provided, calculate weekly data
    let weeklyData: ChartDataResponse | undefined;
    
    if (startDate && endDate) {
      // Filter mudhohi records by date range
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
      });

      const animalTypeNames = allTipeHewanData.map(type => type.nama);

      // Helper function to get proper ISO week
      const getISOWeek = (date: Date): string => {
        const target = new Date(date.valueOf());
        const dayNumber = (date.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNumber + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
        return `${target.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      };

      // Process weekly data
      const weeklyDataMap = new Map<string, { [key: string]: number }>();
      const weeklyRevenue = new Map<string, number>();
      let rangeTotalSales = 0;
      let rangeTotalRevenue = 0;
      const transactions: TransactionDetail[] = [];

      mudohiRecords.forEach(mudhohi => {
        const weekKey = getISOWeek(mudhohi.createdAt);

        if (!weeklyDataMap.has(weekKey)) {
          const weekData: { [key: string]: number } = {};
          animalTypeNames.forEach(type => {
            weekData[type] = 0;
          });
          weeklyDataMap.set(weekKey, weekData);
          weeklyRevenue.set(weekKey, 0);
        }

        const currentWeekData = weeklyDataMap.get(weekKey)!;
        
        // Calculate transaction details
        const hewanTypeMap = new Map<string, { nama: string; harga: number; count: number }>();
        let transactionTotal = 0;
        
        mudhohi.hewan.forEach(hewan => {
          const animalType = hewan.tipe.nama;
          const animalPrice = hewan.tipe.harga;
          
          if (animalType) {
            currentWeekData[animalType] = (currentWeekData[animalType] || 0) + 1;
            rangeTotalSales++;
          }

          // Update transaction details
          if (hewanTypeMap.has(animalType)) {
            const existing = hewanTypeMap.get(animalType)!;
            existing.count += 1;
          } else {
            hewanTypeMap.set(animalType, {
              nama: animalType,
              harga: animalPrice,
              count: 1
            });
          }
          transactionTotal += animalPrice;
        });

        rangeTotalRevenue += transactionTotal;
        weeklyRevenue.set(weekKey, (weeklyRevenue.get(weekKey) || 0) + transactionTotal);

        // Determine payment status
        let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
        if (mudhohi.payment) {
          if (mudhohi.payment.paymentStatus === 'LUNAS') {
            paymentStatus = 'PAID';
          } else if (mudhohi.payment.paymentStatus === 'DOWN_PAYMENT') {
            paymentStatus = 'PARTIAL';
          }
        }

        transactions.push({
          id: mudhohi.id,
          nama_pengqurban: mudhohi.nama_pengqurban,
          createdAt: mudhohi.createdAt,
          totalAmount: transactionTotal,
          paidAmount: mudhohi.payment?.dibayarkan || 0,
          hewanTypes: Array.from(hewanTypeMap.values()),
          paymentStatus
        });
      });

      // Convert to chart format
      const sortedWeeks = Array.from(weeklyDataMap.keys()).sort();
      const chartData: WeeklySalesData[] = sortedWeeks.map((weekKey, index) => ({
        week: weekKey,
        weekNumber: index + 1,
        revenue: weeklyRevenue.get(weekKey) || 0,
        ...weeklyDataMap.get(weekKey)!,
      }));

      weeklyData = {
        data: chartData,
        animalTypes: animalTypeNames,
        totalSales: rangeTotalSales,
        transactions: transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        totalRevenue: rangeTotalRevenue,
        dateRange: {
          start: startDate,
          end: endDate
        }
      };
    }

    return {
      overallStats,
      weeklyData
    };

  } catch (error) {
    console.error('Error fetching combined sales analytics:', error);
    throw new Error('Failed to fetch sales analytics data');
  }
}

/**
 * Standalone function for just weekly data (for backward compatibility)
 */
export async function getAnimalSalesByDateRangeOptimized(
  startDate: Date,
  endDate: Date
): Promise<ChartDataResponse> {
  const result = await getCombinedSalesAnalytics(startDate, endDate);
  if (!result.weeklyData) {
    throw new Error('Weekly data not available');
  }
  return result.weeklyData;
}
/**
 * Get weekly sales data for bar chart with proper ISO week calculation
 * @param startDate Start date for the range
 * @param endDate End date for the range
 * @returns ChartDataResponse with weekly sales data
 */
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
        payment: {
          where: {
            paymentStatus: {
              in: ['LUNAS', 'DOWN_PAYMENT']
            }
          }
        },
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
    const weeklyRevenue = new Map<string, number>()
    let totalSales = 0
    let totalRevenue = 0
    const transactions: TransactionDetail[] = []

    await mudohiRecords.forEach(async mudhohi => {
      const weekKey = await getWeekRange(mudhohi.createdAt, endDate)

      if (!weeklyData.has(weekKey)) {
        const weekData: { [key: string]: number } = {}
        animalTypeNames.forEach(type => {
          weekData[type] = 0
        })
        weeklyData.set(weekKey, weekData)
        weeklyRevenue.set(weekKey, 0)
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
      weeklyRevenue.set(weekKey, (weeklyRevenue.get(weekKey) || 0) + transactionTotal)

      // Determine payment status based on actual payment data
      let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING'
      if (mudhohi.payment) {
        if (mudhohi.payment.paymentStatus === 'LUNAS') {
          paymentStatus = 'PAID'
        } else if (mudhohi.payment.paymentStatus === 'DOWN_PAYMENT') {
          paymentStatus = 'PARTIAL'
        }
      }

      // Add to transactions list
      transactions.push({
        id: mudhohi.id,
        nama_pengqurban: mudhohi.nama_pengqurban,
        createdAt: mudhohi.createdAt,
        totalAmount: transactionTotal,
        paidAmount: mudhohi.payment?.dibayarkan || 0,
        hewanTypes: Array.from(hewanTypeMap.values()),
        paymentStatus
      })
    })
    // Convert to chart format with proper week numbering
    const sortedWeeks = Array.from(weeklyData.keys()).sort()

    const chartData: WeeklySalesData[] = sortedWeeks.map((weekKey, index) => ({
      week: weekKey,
      weekNumber: index + 1,
      revenue: weeklyRevenue.get(weekKey) || 0,
      ...weeklyData.get(weekKey)!,
    }))

    return {
      data: chartData,
      animalTypes: animalTypeNames,
      totalSales,
      transactions: transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      totalRevenue,
      dateRange: {
        start: startDate,
        end: endDate
      }
    }

  } catch (error) {
    console.error('Error fetching qurban sales by date range:', error)
    throw new Error('Failed to fetch qurban sales data')
  } 
}


// Helper function to get proper ISO week
export  async function getISOWeek(date: Date): Promise<string> {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  return `${target.getFullYear()}-W${(weekNumber).toString().padStart(2, '0')}`
}

 // Helper function to get week range format: "1-7 Jan"
export async function getWeekRange(date: Date, eventDate: Date): Promise<string> {
  const dayOfWeek = date.getDay()
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // adjust when day is Sunday
  
  const startOfWeek = new Date(date)
  startOfWeek.setDate(diff)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(0, 0, 0, 0)

  const eventStartOfWeek = new Date(eventDate)
  const eventDay = eventDate.getDay()
  const eventDiff = eventDate.getDate() - eventDay + (eventDay === 0 ? -6 : 1)
  eventStartOfWeek.setDate(eventDiff)
  eventStartOfWeek.setHours(0, 0, 0, 0)
  const msInWeek = 7 * 24 * 60 * 60 * 1000
  const weekDifference = Math.round((eventStartOfWeek.getTime() - startOfWeek.getTime()) / msInWeek)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const startMonth = monthNames[startOfWeek.getMonth()]
  const endMonth = monthNames[endOfWeek.getMonth()]

  const dateRange = startOfWeek.getMonth() === endOfWeek.getMonth()
    ? `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${startMonth}`
    : `${startOfWeek.getDate()} ${startMonth}-${endOfWeek.getDate()} ${endMonth}`

  return `W${weekDifference-5}: ${dateRange}`
}
// Define colors for different categories
const CATEGORY_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#87d068', '#ffb347', '#ff9999', '#87ceeb'
];

export async function getOverviewData(): Promise<{
  pieData: CategoryDistribution[]
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
}> {
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
          color: index < CATEGORY_COLORS.length? CATEGORY_COLORS[index % CATEGORY_COLORS.length] : getRandomVibrantColor(),
        };
      })
      .sort((a, b) => b.value - a.value);

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
      pieData,
      totalIncome,
      totalExpense,
      balance,
      transactionCount,
    };

  } catch (error) {
    console.error('Error fetching overview data:', error);
    
    // Return empty data structure on error
    return {
      pieData: [],
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0,
    };
  }
}
