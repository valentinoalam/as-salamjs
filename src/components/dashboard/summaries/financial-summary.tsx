"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/formatters";

export function FinancialSummary() {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/summary');
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        // Set demo data
        setSummary({
          totalIncome: 15000000,
          totalExpense: 12750000,
          balance: 2250000,
          savings: 2250000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <>
        <Card className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tabungan</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pemasukan</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalIncome)}</div>
          <p className="text-xs text-muted-foreground">
            Total pemasukan
          </p>
        </CardContent>
      </Card>
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalExpense)}</div>
          <p className="text-xs text-muted-foreground">
            Total pengeluaran
          </p>
        </CardContent>
      </Card>
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.balance)}</div>
          <p className="text-xs text-muted-foreground">
            Saldo saat ini
          </p>
        </CardContent>
      </Card>
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tabungan</CardTitle>
          <PiggyBank className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.savings)}</div>
          <p className="text-xs text-muted-foreground">
            Total tabungan
          </p>
        </CardContent>
      </Card>
    </>
  );
}