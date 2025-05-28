"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TransactionsTab from "./parts/transactions-tab"
import CategoriesTab from "./parts/categories-tab"
import BudgetsTab from "./parts/budgets-tab"
import QurbanSales from "./parts/qurban-sales-view/view"
import QurbanTransactionTab from "./parts/qurban-trx-tab"
// import { BudgetProgress } from '@/components/dashboard/summaries/budget-progress';

export default function KeuanganPage() {
  const [activeTab, setActiveTab] = useState("transactions")

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Manajemen Keuangan</h1>
      <QurbanSales />
      {/* <BudgetProgress /> */}
      <Tabs defaultValue="transactions" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="qurban">Qurban</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
          <TabsTrigger value="budgets">Anggaran</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>
        <TabsContent value="qurban">
          <QurbanTransactionTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetsTab/>
        </TabsContent>
      </Tabs>
    </div>
  )
}