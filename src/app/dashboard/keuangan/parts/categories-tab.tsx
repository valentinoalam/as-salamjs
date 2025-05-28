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
import CategoryForm from "./category-form"
import { useKeuangan } from "@/contexts/keuangan-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Category } from "@/types/keuangan"

export default function CategoriesTab() {
  const { categoriesQuery, deleteCategory } = useKeuangan()
  const { data: categories, isLoading: isLoadingCategories } = categoriesQuery
  const [updating, setUpdating] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const handleCategoryCreated = (success: boolean, newCategory?: Category) => {
    if (success && newCategory) {
      toast({
        title: "Category Created",
        description: `${newCategory.name} has been created successfully.`,
      })
    }
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  const handleCategoryUpdated = (success: boolean, updatedCategory?: Category) => {
    if (success && updatedCategory) {
      toast({
        title: "Category Updated",
        description: `${updatedCategory.name} has been updated successfully.`,
      })
    }
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return "Failed to delete category."
  }

  const handleDeleteCategory = async (id: number) => {
    setUpdating(true)
    try {
      const result = await deleteCategory(id)
      if (result.success) {
        toast({
          title: "Category Deleted",
          description: "The category has been deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: getErrorMessage(result.error),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
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
            Income
          </Badge>
        )
      case TransactionType.PENGELUARAN:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Expense
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const CategorySkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Financial Categories</h3>
        <Button
          onClick={() => {
            setEditingCategory(null)
            setIsFormOpen(true)
          }}
          disabled={isLoadingCategories}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <CategoryForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={editingCategory}
        onCategoryCreated={handleCategoryCreated}
        onCategoryUpdated={handleCategoryUpdated}
      />

      <div className="space-y-4">
        {isLoadingCategories ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => <CategorySkeletonRow key={i} />)}
              </TableBody>
            </Table>
          </Card>
        ) : categories?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="text-muted-foreground mb-4">No categories found. Add your first category to get started.</p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Transaksi</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{getTypeBadge(category.type)}</TableCell>
                    <TableCell>{category.trxCount}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCategory(category)}
                          aria-label={`Edit ${category.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              aria-label={`Delete ${category.name}`}
                              disabled={updating}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the "{category.name}" category?
                                This may affect related transactions and budgets.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCategory(category.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={updating}
                              >
                                {updating ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}