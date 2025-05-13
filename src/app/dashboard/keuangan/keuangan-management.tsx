"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { TransactionType, TransactionCategory } from "@prisma/client"
import { getTransactions, createTransaction, uploadReceipt } from "./actions"
import { exportToExcel } from "@/lib/excel"
import { CalendarIcon, Plus, RefreshCw, Download, FileText, Search } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type TransactionStats = {
  totalIncome: number
  totalExpense: number
  balance: number
}

type Transaction = {
  id: string
  amount: number
  description: string
  type: TransactionType
  category: TransactionCategory
  date: Date
  receiptUrl: string | null
  createdBy: string
  createdAt: Date
}

interface KeuanganManagementProps {
  initialStats: TransactionStats
  initialTransactions: Transaction[]
}

export default function KeuanganManagement({ initialStats, initialTransactions }: KeuanganManagementProps) {
  const [stats, setStats] = useState<TransactionStats>(initialStats)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL")
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | "ALL">("ALL")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    amount: 0,
    description: "",
    type: TransactionType.PEMASUKAN,
    category: TransactionCategory.OTHER,
    date: new Date(),
  })

  const refreshData = async () => {
    setLoading(true)
    try {
      const data = await getTransactions(
        typeFilter === "ALL" ? undefined : typeFilter,
        categoryFilter === "ALL" ? undefined : categoryFilter,
        searchTerm || undefined,
      )
      setTransactions(data)

      // Recalculate stats
      const income = data.filter((t) => t.type === TransactionType.PEMASUKAN).reduce((sum, t) => sum + t.amount, 0)
      const expense = data.filter((t) => t.type === TransactionType.PENGELUARAN).reduce((sum, t) => sum + t.amount, 0)

      setStats({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = async () => {
    setLoading(true)
    try {
      const data = await getTransactions(
        typeFilter === "ALL" ? undefined : typeFilter,
        categoryFilter === "ALL" ? undefined : categoryFilter,
        searchTerm || undefined,
      )
      setTransactions(data)
    } catch (error) {
      console.error("Error filtering data:", error)
      toast({
        title: "Error",
        description: "Failed to filter data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0])
    }
  }

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create transaction first
      const result = await createTransaction({
        ...formData,
        date: selectedDate || new Date(),
      })

      if (result.success && result.transactionId) {
        // If there's a receipt file, upload it
        if (receiptFile) {
          const formData = new FormData()
          formData.append("file", receiptFile)
          formData.append("transactionId", result.transactionId)

          const uploadResult = await uploadReceipt(formData)

          if (!uploadResult.success) {
            toast({
              title: "Warning",
              description: "Transaction saved but failed to upload receipt. You can try again later.",
              variant: "destructive",
            })
          }
        }

        toast({
          title: "Transaction Added",
          description: "The transaction has been recorded successfully.",
        })

        // Close dialog and reset form
        setAddDialogOpen(false)
        setFormData({
          amount: 0,
          description: "",
          type: TransactionType.PEMASUKAN,
          category: TransactionCategory.OTHER,
          date: new Date(),
        })
        setSelectedDate(new Date())
        setReceiptFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }

        // Refresh data
        refreshData()
      } else {
        throw new Error(result.error || "Failed to add transaction")
      }
    } catch (error) {
      console.error("Error adding transaction:", error)
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = () => {
    const data = transactions.map((t) => ({
      ID: t.id,
      Type: t.type === TransactionType.PEMASUKAN ? "Pemasukan" : "Pengeluaran",
      Category: getCategoryLabel(t.category),
      Amount: t.amount,
      Description: t.description,
      Date: format(new Date(t.date), "dd/MM/yyyy"),
      "Has Receipt": t.receiptUrl ? "Yes" : "No",
      "Created At": format(new Date(t.createdAt), "dd/MM/yyyy HH:mm"),
    }))

    exportToExcel(data, "keuangan_transactions")
  }

  const getTypeLabel = (type: TransactionType) => {
    switch (type) {
      case TransactionType.PEMASUKAN:
        return "Pemasukan"
      case TransactionType.PENGELUARAN:
        return "Pengeluaran"
      default:
        return type
    }
  }

  const getCategoryLabel = (category: TransactionCategory) => {
    switch (category) {
      case TransactionCategory.QURBAN_PAYMENT:
        return "Pembayaran Qurban"
      case TransactionCategory.OPERATIONAL:
        return "Operasional"
      case TransactionCategory.SUPPLIES:
        return "Perlengkapan"
      case TransactionCategory.TRANSPORT:
        return "Transportasi"
      case TransactionCategory.SALARY:
        return "Gaji/Honor"
      case TransactionCategory.OTHER:
        return "Lainnya"
      default:
        return category
    }
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

  const getCategoryBadge = (category: TransactionCategory) => {
    switch (category) {
      case TransactionCategory.QURBAN_PAYMENT:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            Pembayaran Qurban
          </Badge>
        )
      case TransactionCategory.OPERATIONAL:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Operasional
          </Badge>
        )
      case TransactionCategory.SUPPLIES:
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
            Perlengkapan
          </Badge>
        )
      case TransactionCategory.TRANSPORT:
        return (
          <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">
            Transportasi
          </Badge>
        )
      case TransactionCategory.SALARY:
        return (
          <Badge variant="outline" className="bg-pink-100 text-pink-800 border-pink-300">
            Gaji/Honor
          </Badge>
        )
      case TransactionCategory.OTHER:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
            Lainnya
          </Badge>
        )
      default:
        return <Badge variant="outline">{category}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">Rp {stats.totalIncome.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">Rp {stats.totalExpense.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              Rp {stats.balance.toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              onKeyDown={(e) => e.key === "Enter" && handleFilterChange()}
            />
            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={handleFilterChange}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TransactionType | "ALL")}>
            <SelectTrigger className="w-full md:w-40">
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
            onValueChange={(value) => setCategoryFilter(value as TransactionCategory | "ALL")}
          >
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value={TransactionCategory.QURBAN_PAYMENT}>Pembayaran Qurban</SelectItem>
              <SelectItem value={TransactionCategory.OPERATIONAL}>Operasional</SelectItem>
              <SelectItem value={TransactionCategory.SUPPLIES}>Perlengkapan</SelectItem>
              <SelectItem value={TransactionCategory.TRANSPORT}>Transportasi</SelectItem>
              <SelectItem value={TransactionCategory.SALARY}>Gaji/Honor</SelectItem>
              <SelectItem value={TransactionCategory.OTHER}>Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={refreshData} disabled={loading} className="w-full md:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportToExcel} className="w-full md:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
                <DialogDescription>Enter the details of the financial transaction.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitTransaction}>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleFormChange("type", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TransactionType.PEMASUKAN}>Pemasukan</SelectItem>
                        <SelectItem value={TransactionType.PENGELUARAN}>Pengeluaran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleFormChange("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TransactionCategory.QURBAN_PAYMENT}>Pembayaran Qurban</SelectItem>
                        <SelectItem value={TransactionCategory.OPERATIONAL}>Operasional</SelectItem>
                        <SelectItem value={TransactionCategory.SUPPLIES}>Perlengkapan</SelectItem>
                        <SelectItem value={TransactionCategory.TRANSPORT}>Transportasi</SelectItem>
                        <SelectItem value={TransactionCategory.SALARY}>Gaji/Honor</SelectItem>
                        <SelectItem value={TransactionCategory.OTHER}>Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (Rp)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleFormChange("amount", Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFormChange("description", e.target.value)}
                      placeholder="Enter transaction details"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receipt">Receipt Photo (Optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="receipt"
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Upload a photo of the receipt or invoice (JPG, PNG)</p>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Transaction"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-center p-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{format(new Date(transaction.date), "dd/MM/yyyy")}</td>
                    <td className="p-2">{getTypeBadge(transaction.type)}</td>
                    <td className="p-2">{getCategoryBadge(transaction.category)}</td>
                    <td className="p-2">{transaction.description}</td>
                    <td className="p-2 text-right font-medium">
                      <span
                        className={transaction.type === TransactionType.PEMASUKAN ? "text-green-600" : "text-red-600"}
                      >
                        Rp {transaction.amount.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      {transaction.receiptUrl ? (
                        <a
                          href={transaction.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">No receipt</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="text-muted-foreground mb-4">No transactions found with the current filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setTypeFilter("ALL")
                  setCategoryFilter("ALL")
                  refreshData()
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
