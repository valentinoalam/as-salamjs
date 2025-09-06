"use client"

import { useState } from "react"
import { TransactionType } from "@prisma/client"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
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
import BudgetForm from "./budget-form"
import { formatCurrency } from "#@/lib/utils/formatters.ts"
import { Progress } from "@/components/ui/progress"
import type { Budget, Category } from "@/types/keuangan"
import { Skeleton } from "@/components/ui/skeleton"
import { useFinancialData } from "@/hooks/qurban/use-keuangan";

export default function BudgetsTab() {
  const {
    budgetsQuery,
    categoriesQuery,
    transactionsQuery,
    deleteBudget,
  } = useFinancialData()
  
  const { data: budgets, isLoading: isBudgetsLoading } = budgetsQuery
  const { data: transactions, isLoading: isTransactionsLoading } = transactionsQuery
  const { data: categories, isLoading: isCategoriesLoading } = categoriesQuery
  
  const [updating, setUpdating] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  // Derived states
  const isLoading = isBudgetsLoading || isTransactionsLoading || isCategoriesLoading
  const isEmpty = !isLoading && (!budgets || budgets.length === 0)

  const handleBudgetCreated = async (success: boolean, newBudget?: Budget) => {
    if (success && newBudget) {
      toast({
        title: "Budget Created",
        description: "The budget has been created successfully.",
      })
    }
    setIsFormOpen(false)
    setEditingBudget(null)
  }

  const handleBudgetUpdated = (success: boolean, updatedBudget?: Budget) => {
    if (success && updatedBudget) {
      toast({
        title: "Budget Updated",
        description: "The budget has been updated successfully.",
      })
    }
    setIsFormOpen(false)
    setEditingBudget(null)
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setIsFormOpen(true)
  }

  const handleDeleteBudget = async (id: string) => {
    setUpdating(true)
    try {
      const result = await deleteBudget(id)
      if (result.success) {
        toast({
          title: "Budget Deleted",
          description: "The budget has been deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: String(result.error || "Failed to delete budget."),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting budget:", error)
      toast({
        title: "Error",
        description: "Failed to delete budget. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
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

  const getBudgetProgress = (budget: Budget) => {
    if (!transactions) {
      return { usedAmount: 0, percentageUsed: 0, isOverBudget: false }
    }

    const relevantTransactions = transactions.filter(
      (t) =>
        t.categoryId === budget.categoryId &&
        new Date(t.date) >= new Date(budget.startDate) &&
        new Date(t.date) <= new Date(budget.endDate) &&
        t.type === budget.category.type,
    )

    const usedAmount = relevantTransactions.reduce((sum, t) => sum + t.amount, 0)
    const percentageUsed = budget.amount > 0 
      ? Math.min((usedAmount / budget.amount) * 100, 100)
      : 0

    return {
      usedAmount,
      percentageUsed,
      isOverBudget: usedAmount > budget.amount,
    }
  }

  const getBudgetProgressBadge = (budget: Budget) => {
    const { percentageUsed, isOverBudget } = getBudgetProgress(budget)

    if (isOverBudget) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
          Over Budget ({percentageUsed.toFixed(1)}%)
        </Badge>
      )
    } else if (percentageUsed > 85) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          {percentageUsed.toFixed(1)}% Used
        </Badge>
      )
    } else if (percentageUsed > 0) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          {percentageUsed.toFixed(1)}% Used
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
          Not Used
        </Badge>
      )
    }
  }
  
  // Loading Skeleton Component
  const BudgetSkeleton = () => (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  )

  const renderBudgetCard = (budget: Budget) => {
    const { usedAmount, percentageUsed, isOverBudget } = getBudgetProgress(budget)
    
    return (
      <Card key={budget.id} className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold">{budget.category.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {getTypeBadge(budget.category.type)}
                {getBudgetProgressBadge(budget)}
              </div>
            </div>
            <div className="mt-2 md:mt-0 text-right">
              <div className="text-lg font-bold">{formatCurrency(budget.amount)}</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(budget.startDate), "dd MMM yyyy")} -{" "}
                {format(new Date(budget.endDate), "dd MMM yyyy")}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {formatCurrency(usedAmount)}</span>
              <span>Remaining: {formatCurrency(Math.max(budget.amount - usedAmount, 0))}</span>
            </div>
            <Progress
              value={percentageUsed}
              className={`h-2 ${isOverBudget ? "bg-red-200" : "bg-gray-200"}`}
              indicatorClassName={isOverBudget ? "bg-red-500" : undefined}
            />
          </div>

          <div className="flex justify-end mt-4 space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleEditBudget(budget)}
              disabled={updating}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700"
                  disabled={updating}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this budget? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteBudget(budget.id)}
                    className="bg-red-500 hover:bg-red-600"
                    disabled={updating}
                  >
                    {updating ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderEmptyState = () => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">
          No budgets found. Add your first budget to get started.
        </p>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Budget Management</h3>
        <Button
          onClick={() => {
            setEditingBudget(null)
            setIsFormOpen(true)
          }}
          disabled={updating}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      <BudgetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        budget={editingBudget}
        categories={categories as Category[]}
        onBudgetCreated={handleBudgetCreated}
        onBudgetUpdated={handleBudgetUpdated}
      />

      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => <BudgetSkeleton key={i} />)}
          </div>
        ) : isEmpty ? (
          renderEmptyState()
        ) : (
          budgets && budgets.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {budgets.map(renderBudgetCard)}
            </div>
          )
        )}
      </div>
    </div>
  )
}