import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryList } from "@/components/categories/category-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export default function CategoriesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Kelola kategori transaksi
          </p>
        </div>
        <Button asChild>
          <Link href="/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Kategori Baru
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="income">Pemasukan</TabsTrigger>
          <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <CategoryList type="ALL" />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="income" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <CategoryList type="INCOME" />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="expense" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <CategoryList type="EXPENSE" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}