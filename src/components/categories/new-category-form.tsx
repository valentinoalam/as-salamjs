"use client";

import { useRouter } from "next/navigation";
import { TransactionType } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "#@/lib/utils/utils.ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { ArrowUpDown } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "Nama kategori minimal 3 karakter"),
  type: z.enum([TransactionType.PEMASUKAN, TransactionType.PENGELUARAN]),
});

type FormValues = z.infer<typeof formSchema>;

export function NewCategoryForm() {
  const router = useRouter();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: TransactionType.PENGELUARAN,
    },
  });
  
  const onSubmit = async (values: FormValues) => {
    try {
      // In a real application, you would send this to your API
      // const response = await fetch('/api/keuangan/categories', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(values),
      // });
      
      // if (!response.ok) throw new Error('Failed to create category');
      
      toast({
        title: "Kategori berhasil dibuat",
        description: `Kategori "${values.name}" telah berhasil dibuat.`,
      });
      
      router.push('/categories');
    } catch (error) {
      console.error('Failed to create category:', error);
      toast({
        title: "Gagal membuat kategori",
        description: "Terjadi kesalahan saat membuat kategori. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan nama kategori"
                        {...field}
                      />
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
                    <FormLabel>Jenis Kategori</FormLabel>
                    <div className="flex rounded-md overflow-hidden">
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "rounded-r-none flex-1 border-r-0",
                          field.value === TransactionType.PEMASUKAN && "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800"
                        )}
                        onClick={() => field.onChange(TransactionType.PEMASUKAN)}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2 text-green-500" />
                        Pemasukan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "rounded-l-none flex-1",
                          field.value === TransactionType.PENGELUARAN && "bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800"
                        )}
                        onClick={() => field.onChange(TransactionType.PENGELUARAN)}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2 text-red-500" />
                        Pengeluaran
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit">Simpan Kategori</Button>
        </div>
      </form>
    </Form>
  );
}