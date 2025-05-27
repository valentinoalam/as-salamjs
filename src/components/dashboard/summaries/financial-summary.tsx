"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Wallet, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useKeuangan } from "@/contexts/keuangan-context";

export function FinancialSummary() {
  const { statsQuery } = useKeuangan();
  const { data: stats, isLoading, error} = statsQuery
  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm">Failed to load financial summary</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Pemasukan", value: 0, description: "Total pemasukan", icon: TrendingUp },
          { title: "Pengeluaran", value: 0, description: "Total pengeluaran", icon: TrendingDown },
          { title: "Saldo", value: 0, description: "Saldo saat ini", icon: Wallet }
        ].map((item, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(item.value)}</div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { totalIncome, totalExpense, balance } = stats;

  // Determine balance trend
  const balanceColor = balance >= 0 ? "text-green-600" : "text-red-600";
  const BalanceIcon = balance >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Income Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-muted-foreground">Total pemasukan</p>
        </CardContent>
      </Card>

      {/* Expense Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totalExpense)}
          </div>
          <p className="text-xs text-muted-foreground">Total pengeluaran</p>
        </CardContent>
      </Card>

      {/* Balance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          <BalanceIcon className={`h-4 w-4 ${balanceColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${balanceColor}`}>
            {formatCurrency(balance)}
          </div>
          <p className="text-xs text-muted-foreground">Saldo saat ini</p>
        </CardContent>
      </Card>
    </div>
  );
}