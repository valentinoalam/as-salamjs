"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TransactionType } from "@prisma/client"
import { CalendarIcon, Plus, RefreshCw, Download, FileText, Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

import TransactionForm from "./transaction-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { exportToExcel } from "@/lib/excel"
import { Overview } from "@/components/dashboard/summaries/overview"
import type { Category, Image } from "@/types/keuangan"
import { formatCurrency } from "@/lib/formatters"
import { useKeuangan } from "@/contexts/keuangan-context"

const ITEMS_PER_PAGE = 10

export default function TransactionsTab() {
  // Use centralized keuangan context with filter state
  const {
    transactionsQuery,
    categoriesQuery,
    deleteTransaction,
    filteredTransactions,
    searchTerm,
    typeFilter,
    categoryFilter,
    dateRange,
    setSearchTerm,
    setTypeFilter,
    setCategoryFilter,
    setDateRange,
    resetFilters,
  } = useKeuangan()

  // Local UI state only
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Get data from context
  const { isLoading: transactionsLoading, refetch: refetchTransactions } = transactionsQuery
  const { data: categories = [] } = categoriesQuery

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filteredTransactions.length])

  const handleTransactionCreated = async (success: boolean) => {
    if (success) {
      setIsFormOpen(false)
      await refetchTransactions()
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    // Prevent deletion of qurban transactions
    if (id.startsWith('qurban-')) {
      toast({
        title: "Cannot Delete",
        description: "Qurban transactions cannot be deleted.",
        variant: "destructive",
      })
      return
    }

    try {
      await deleteTransaction(id)
      toast({
        title: "Transaction Deleted",
        description: "The transaction has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExportToExcel = () => {
    const data = filteredTransactions.map((t) => ({
      ID: t.id,
      Type: t.type === TransactionType.PEMASUKAN ? "Pemasukan" : "Pengeluaran",
      Category: t.category.name,
      Amount: t.amount,
      Description: t.description,
      Date: format(new Date(t.date), "dd/MM/yyyy"),
      "Number of Receipts": t.receiptUrl?.length || 0,
      "Created At": format(new Date(t.createdAt), "dd/MM/yyyy HH:mm"),
      "Source": t.isQurbanTransaction ? "Qurban Sales" : "Manual Entry"
    }))

    exportToExcel(data, "keuangan_transactions")
  }

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case TransactionType.PEMASUKAN:
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Pemasukan
          </Badge>
        )
      case TransactionType.PENGELUARAN:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Pengeluaran
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getCategoryBadge = (category: Category) => {
    const idString = category.id.toString()
    const hash = idString.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)

    const colors = [
      "bg-blue-100 text-blue-800 border-blue-300",
      "bg-purple-100 text-purple-800 border-purple-300",
      "bg-yellow-100 text-yellow-800 border-yellow-300",
      "bg-indigo-100 text-indigo-800 border-indigo-300",
      "bg-pink-100 text-pink-800 border-pink-300",
      "bg-emerald-100 text-emerald-800 border-emerald-300",
      "bg-amber-100 text-amber-800 border-amber-300",
      "bg-cyan-100 text-cyan-800 border-cyan-300",
    ]

    const colorClass = colors[Math.abs(hash) % colors.length]

    return (
      <Badge variant="outline" className={colorClass}>
        {category.name}
      </Badge>
    )
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleRefresh = async () => {
    await refetchTransactions()
  }

  return (
    <div className="space-y-6">
      <Overview />
      
      {/* Filters Section */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and Type/Category Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as TransactionType | "ALL")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value={TransactionType.PEMASUKAN}>Pemasukan</SelectItem>
                  <SelectItem value={TransactionType.PENGELUARAN}>Pengeluaran</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && !dateRange.to && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      "Date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    autoFocus
                    mode="range"
                    selected={dateRange as DateRange}
                    onSelect={(range) => setDateRange(range as DateRange)}
                    numberOfMonths={2}
                    required={false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
                <Button variant="outline" onClick={handleRefresh} disabled={transactionsLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", transactionsLoading && "animate-spin")} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleExportToExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TransactionForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={categories}
        onTransactionCreated={handleTransactionCreated}
      />

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {currentTransactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Description</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-center p-4 font-medium">Receipt</th>
                      <th className="text-center p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4">{format(new Date(transaction.date), "dd/MM/yyyy")}</td>
                        <td className="p-4">{getTypeBadge(transaction.type)}</td>
                        <td className="p-4">{getCategoryBadge(transaction.category)}</td>
                        <td className="p-4 max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                        </td>
                        <td className="p-4 text-right font-medium">
                          <span
                            className={transaction.type === TransactionType.PEMASUKAN ? "text-green-600" : "text-red-600"}
                          >
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {transaction.receiptUrl && transaction.receiptUrl.length > 0 ? (
                            <div className="flex justify-center items-center gap-1">
                              {transaction.receiptUrl.map((image: Image, index: number) => (
                                <a
                                  key={image.id}
                                  href={image.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title={`Receipt ${index + 1}`}
                                >
                                  <FileText className="h-4 w-4" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No receipt</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {!transaction.id.startsWith('qurban-') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this transaction? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8">
              <p className="text-muted-foreground mb-4">
                {transactionsLoading ? "Loading transactions..." : "No transactions found with the current filters."}
              </p>
              {!transactionsLoading && (searchTerm || typeFilter !== "ALL" || categoryFilter !== "ALL" || dateRange.from) && (
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}