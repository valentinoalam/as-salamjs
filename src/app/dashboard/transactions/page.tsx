import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionFilters } from "@/components/transactions/transaction-filters";

export default function TransactionsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            Transaksi Baru
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="income">Pemasukan</TabsTrigger>
            <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
          </TabsList>
        </div>
        
        <TransactionFilters />
        
        <TabsContent value="all" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <TransactionsList type="ALL" />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="income" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <TransactionsList type="INCOME" />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="expense" className="space-y-4">
          <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
            <TransactionsList type="EXPENSE" />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}