"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { TransactionType } from "@prisma/client"
import { toast } from "@/hooks/use-toast"
import { categorySchema, type CategoryFormValues } from "../../../../lib/zod/keuangan"

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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useKeuangan } from "@/contexts/keuangan-context"
import type { Category } from "@/types/keuangan"

interface CategoryFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  onCategoryCreated: (success: boolean, category?: Category) => void
  onCategoryUpdated: (success: boolean, category?: Category) => void
}

export default function CategoryForm({
  isOpen,
  onOpenChange,
  category,
  onCategoryCreated,
  onCategoryUpdated,
}: CategoryFormProps) {
  const [loading, setLoading] = useState(false)
  const {createCategory, updateCategory } = useKeuangan()
  const isEditing = !!category

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      type: category?.type || TransactionType.PEMASUKAN,
    },
  })

  const onSubmit = async (data: CategoryFormValues) => {
    setLoading(true)

    try {
      if (isEditing && category) {
        // Update existing category
        const result = await updateCategory(category.id, data)
        if (result.success) {
          toast({
            title: "Category Updated",
            description: "The category has been updated successfully.",
          })
          onCategoryUpdated(true, result.data)
        } else {
          throw new Error(result.error || "Failed to update category")
        }
      } else {
        // Create new category
        const result = await createCategory(data)
        if (result.success) {
          toast({
            title: "Category Added",
            description: "The category has been created successfully.",
          })
          onCategoryCreated(true, result.data)
        } else {
          throw new Error(result.error || "Failed to create category")
        }
      }
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "creating"} category:`, error)
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} category. Please try again.`,
        variant: "destructive",
      })
      if (isEditing) {
        onCategoryUpdated(false)
      } else {
        onCategoryCreated(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Category" : "Add New Category"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of the financial category."
              : "Create a new financial category for transactions."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Donation, Supplies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TransactionType.PEMASUKAN}>Pemasukan (Income)</SelectItem>
                      <SelectItem value={TransactionType.PENGELUARAN}>Pengeluaran (Expense)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEditing ? "Update Category" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
