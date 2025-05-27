"use client"

import type React from "react"

import { useState, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { TransactionType } from "@prisma/client"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { transactionSchema, type TransactionFormValues } from "@/lib/zod/keuangan"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import type { Category } from "@/types/keuangan"
import { useKeuangan } from "@/contexts/keuangan-context"

interface TransactionFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onTransactionCreated: (success: boolean) => void
}

export default function TransactionForm({
  isOpen,
  onOpenChange,
  categories,
  onTransactionCreated,
}: TransactionFormProps) {
  const { createTransaction, uploadReceipt } = useKeuangan()
  const [loading, setLoading] = useState(false)
  const [receiptFiles, setReceiptFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      description: "",
      type: TransactionType.PEMASUKAN,
      categoryId: categories.find((c) => c.type === TransactionType.PEMASUKAN)?.id || 1,
      date: new Date(),
    },
  })

  const watchType = form.watch("type")

  // Filter categories based on selected type
  const filteredCategories = categories.filter((category) => category.type === watchType)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setReceiptFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeReceiptFile = (index: number) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    form.reset({
      amount: 0,
      description: "",
      type: TransactionType.PEMASUKAN,
      categoryId: categories.find((c) => c.type === TransactionType.PEMASUKAN)?.id || 1,
      date: new Date(),
    })
    setReceiptFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const onSubmit = async (data: TransactionFormValues) => {
    setLoading(true)
    console.log(data)
    try {
      // Create transaction first
      const result = await createTransaction(data)

      if (result.success && result.transactionId) {
        // If there are receipt files, upload them
        if (receiptFiles.length > 0) {
          const formData = new FormData()
          receiptFiles.forEach((file) => {
            formData.append("files", file)
          })
          formData.append("transactionId", result.transactionId)

          const uploadResult = await uploadReceipt(formData)

          if (!uploadResult.success) {
            toast({
              title: "Warning",
              description: "Transaction saved but failed to upload receipt(s). You can try again later.",
              variant: "destructive",
            })
          }
        }

        toast({
          title: "Transaction Added",
          description: "The transaction has been recorded successfully.",
        })

        // Close dialog and reset form
        resetForm()
        onTransactionCreated(true)
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
      onTransactionCreated(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>Enter the details of the financial transaction.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      // Reset category when type changes
                      const defaultCategory = categories.find((c) => c.type === value)?.id || 1
                      form.setValue("categoryId", defaultCategory)
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TransactionType.PEMASUKAN}>Pemasukan</SelectItem>
                      <SelectItem value={TransactionType.PENGELUARAN}>Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  {filteredCategories.length === 0 && (
                    <FormDescription className="text-red-500">
                      Please add categories first in the Categories tab
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (Rp)</FormLabel>
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

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter transaction details" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel htmlFor="receipt">Receipt Photo (Optional)</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="flex-1"
                  multiple
                />
              </div>

              {receiptFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium">Selected Files:</p>
                  <div className="flex flex-wrap gap-2">
                    {receiptFiles.map((file, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {file.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => removeReceiptFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">Upload photos of receipts or invoices (JPG, PNG)</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm()
                  onOpenChange(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || filteredCategories.length === 0}>
                {loading ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
