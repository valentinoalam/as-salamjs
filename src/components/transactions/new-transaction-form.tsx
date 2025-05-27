"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { TransactionType } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ImageUploader } from "@/components/transactions/image-uploader";
import { toast } from "@/hooks/use-toast";
import { ArrowUpDown, Calendar as CalendarIcon } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
}

const formSchema = z.object({
  type: z.enum([TransactionType.PEMASUKAN, TransactionType.PENGELUARAN]),
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  date: z.date(),
  description: z.string().min(3, "Deskripsi minimal 3 karakter"),
  categoryId: z.string().min(1, "Kategori harus dipilih"),
  images: z.array(z.string().url()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function NewTransactionForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: TransactionType.PENGELUARAN,
      amount: 0,
      date: new Date(),
      description: "",
      categoryId: "",
      images: [],
    },
  });
  
  const transactionType = form.watch("type");
  
  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Mock data
        setCategories([
          { id: '1', name: 'Pembelian Hewan Qurban - Sapi', type: 'EXPENSE' },
          { id: '2', name: 'Biaya Distribusi Daging', type: 'EXPENSE' },
          { id: '3', name: 'Donasi Qurban', type: 'INCOME' },
          { id: '4', name: 'Biaya Pemotongan & Pengulitan', type: 'EXPENSE' },
          { id: '5', name: 'Belanja Bumbu & Bahan Masakan', type: 'EXPENSE' },
          { id: '6', name: 'Sedekah Idul Adha', type: 'INCOME' },
          { id: '7', name: 'Penjualan Kulit Hewan', type: 'INCOME' },
          { id: '8', name: 'Lain-lain (Pemasukan)', type: 'INCOME' },
          { id: '9', name: 'Sewa Alat', type: 'EXPENSE' },
          { id: '10', name: 'Lain-lain (Pengeluaran)', type: 'EXPENSE' },
        ]);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Reset category when transaction type changes
  useEffect(() => {
    form.setValue("categoryId", "");
  }, [transactionType, form]);
  
  const onSubmit = async (values: FormValues) => {
    // Add uploaded images to form values
    values.images = uploadedImages;
    
    try {
      // In a real application, you would send this to your API
      // const response = await fetch('/api/transactions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(values),
      // });
      
      // if (!response.ok) throw new Error('Failed to create transaction');
      
      toast({
        title: "Transaksi berhasil dibuat",
        description: "Transaksi baru telah berhasil dicatat.",
      });
      
      router.push('/transactions');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast({
        title: "Gagal membuat transaksi",
        description: "Terjadi kesalahan saat mencatat transaksi. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Transaksi</FormLabel>
                    <div className="flex rounded-md overflow-hidden">
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "rounded-r-none flex-1 border-r-0",
                          field.value === TransactionType.PEMASUKAN && "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800"
                        )}
                        onClick={() => field.onChange(TransactionType.PENGELUARAN)}
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
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0"
                        type="number"
                        {...field}
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
                    <FormLabel>Tanggal Transaksi</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd MMMM yyyy", { locale: id })
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2020-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories
                          .filter(category => category.type === transactionType)
                          .map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Masukkan detail transaksi..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-2">
                <Label htmlFor="images">Foto Bukti</Label>
                <ImageUploader
                  onImagesChange={setUploadedImages}
                  existingImages={[]}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Unggah foto struk, kwitansi, atau bukti transaksi lainnya
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit">Simpan Transaksi</Button>
        </div>
      </form>
    </Form>
  );
}