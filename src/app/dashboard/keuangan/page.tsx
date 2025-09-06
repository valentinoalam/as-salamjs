"use client"

import { lazy, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableSkeleton } from "@/components/table-skeleton";
import { useUIStore } from "@/stores/ui-store";

// Lazily load your components
const TransactionsTab = lazy(() => import("./parts/transactions-tab"));
const CategoriesTab = lazy(() => import("./parts/categories-tab"));
const BudgetsTab = lazy(() => import("./parts/budgets-tab"));
const OverviewKeuanganQurbanTab = lazy(() => import("./parts/overview-tab"));
export default function KeuanganPage() {
  const {tabs, setActiveTab} = useUIStore()
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Manajemen Keuangan</h1>
      <Tabs defaultValue="overview" value={tabs.keuangan} onValueChange={(value) => setActiveTab("keuangan", value)}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
          <TabsTrigger value="budgets">Anggaran</TabsTrigger>
        </TabsList>
        <Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
          <TabsContent value="overview">
            <OverviewKeuanganQurbanTab />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>

          <TabsContent value="budgets">
            <BudgetsTab/>
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  )
}