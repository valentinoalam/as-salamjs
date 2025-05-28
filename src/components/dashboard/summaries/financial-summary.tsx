"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Wallet, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useKeuangan } from "@/contexts/keuangan-context";

  
export function FinancialSummary({qSales}: {qSales: number}) {
  const { statsQuery } = useKeuangan();
  const { data: stats, error} = statsQuery

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

  const { 
    totalIncome: otherIncome, 
    totalExpense, 
    incomeTransactionCount, 
    expenseTransactionCount
  } = stats;
  const totalIncome = qSales + otherIncome
  const balance = totalIncome - totalExpense
  // Determine balance trend
  const balanceColor = balance >= 0 ? "text-green-600" : "text-red-600";
  const BalanceIcon = balance === 0 ? Scale : balance >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Income Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total pemasukan dari {incomeTransactionCount} transaksi</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>

          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </div>
          { qSales && <p className="text-xs text-muted-foreground">Pemasukan lain-lainnya: {formatCurrency(otherIncome)}</p> }
        </CardContent>
      </Card>

      {/* Expense Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total pengeluaran dari {expenseTransactionCount} transaksi</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totalExpense)}
          </div>
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