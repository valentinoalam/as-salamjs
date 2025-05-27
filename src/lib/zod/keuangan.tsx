import { z } from "zod"
import { TransactionType } from "@prisma/client"

// Transaction schema
export const transactionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  categoryId: z.coerce.number().positive("Amount must be greater than 0"),
  type: z.nativeEnum(TransactionType),
  date: z.date(),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>

// Category schema
export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.nativeEnum(TransactionType),
  deskripsi: z.string().optional()
})

export type TransactionCategoryInput = z.input<typeof categorySchema>
export type CategoryFormValues = z.infer<typeof categorySchema>

// Budget schema
export const budgetSchema = z
  .object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    categoryId: z.coerce.number(),
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })

export type BudgetFormValues = z.infer<typeof budgetSchema>
