"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { TransactionType } from "@prisma/client"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "#@/lib/utils/utils.ts"
import { toast } from "@/hooks/use-toast"
import { budgetSchema, type BudgetFormValues } from "@/lib/zod/keuangan"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import type { Category } from "@/types/keuangan"
import { useFinancialData } from "@/hooks/qurban/use-keuangan"

type Budget = {
  id: string
  amount: number
  categoryId: number
  category: Category
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}

interface BudgetFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  budget: Budget | null
  categories: Category[]
  onBudgetCreated: (success: boolean, budget?: Budget) => void
  onBudgetUpdated: (success: boolean, budget?: Budget) => void
}

export default function BudgetForm({
  isOpen,
  onOpenChange,
  budget,
  categories,
  onBudgetCreated,
  onBudgetUpdated,
}: BudgetFormProps) {
  const { createBudget, updateBudget } = useFinancialData()
  const [loading, setLoading] = useState(false)
  const isEditing = !!budget
  const [selectedType, setSelectedType] = useState<TransactionType>(budget?.category.type || TransactionType.PEMASUKAN)

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      amount: budget?.amount || 0,
      categoryId: budget?.categoryId || 1,
      startDate: budget?.startDate ? new Date(budget.startDate) : new Date(),
      endDate: budget?.endDate ? new Date(budget.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
    },
  })

  // Filter categories based on selected type
  const filteredCategories = categories.filter((category) => category.type === selectedType)

  const onSubmit = async (data: BudgetFormValues) => {
    setLoading(true)

    try {
      if (isEditing && budget) {
        // Update existing budget
        const result = await updateBudget(budget.id, data)
        onBudgetUpdated( result.success, data as Budget)
      } else {
        // Create new budget
        const result = await createBudget(data)
        onBudgetCreated(result.success, data as Budget)
      }
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "creating"} budget:`, error)
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} budget. Please try again.`,
        variant: "destructive",
      })
      if (isEditing) {
        onBudgetUpdated(false)
      } else {
        onBudgetCreated(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Budget" : "Add New Budget"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details of the budget." : "Create a new budget to track your financial goals."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Amount (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div>
                  <FormLabel>Category Type</FormLabel>
                  <Select
                    value={selectedType}
                    onValueChange={(value) => {
                      setSelectedType(value as TransactionType)
                      // Reset category when type changes
                      const defaultCategory = categories.find((c) => c.type === value)?.id || 1
                      form.setValue("categoryId", defaultCategory)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TransactionType.PEMASUKAN}>Pemasukan (Income)</SelectItem>
                      <SelectItem value={TransactionType.PENGELUARAN}>Pengeluaran (Expense)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              No categories available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || filteredCategories.length === 0}>
                {loading ? "Saving..." : isEditing ? "Update Budget" : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
