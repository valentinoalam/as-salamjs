"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatters";

interface Budget {
  id: string;
  amount: number;
  spent: number;
  categoryId: string;
  category: {
    name: string;
  };
  startDate: string;
  endDate: string;
}

export function BudgetProgress() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await fetch('/api/budgets');
        if (response.ok) {
          const data = await response.json();
          setBudgets(data);
        }
      } catch (error) {
        console.error('Failed to fetch budgets:', error);
        // Mock data
        setBudgets([
          {
            id: '1',
            amount: 10000000,
            spent: 9000000,
            categoryId: '1',
            category: {
              name: 'Pembelian Hewan Qurban - Sapi'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
          {
            id: '2',
            amount: 2000000,
            spent: 1500000,
            categoryId: '2',
            category: {
              name: 'Biaya Distribusi Daging'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
          {
            id: '3',
            amount: 1500000,
            spent: 1250000,
            categoryId: '3',
            category: {
              name: 'Biaya Pemotongan & Pengulitan'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
          {
            id: '4',
            amount: 1000000,
            spent: 750000,
            categoryId: '4',
            category: {
              name: 'Belanja Bumbu & Bahan Masakan'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 animate-pulse">
            <div className="flex justify-between">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-4 bg-muted rounded w-1/6"></div>
            </div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/50 rounded-lg">
        <p className="text-lg text-muted-foreground">Belum ada anggaran yang dibuat</p>
        <p className="text-sm text-muted-foreground mt-2">
          Tambahkan anggaran di halaman pengaturan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {budgets.map((budget) => {
        const percentage = Math.min(Math.round((budget.spent / budget.amount) * 100), 100);
        const remaining = budget.amount - budget.spent;
        
        let statusColor = "bg-primary";
        if (percentage > 85) statusColor = "bg-destructive";
        else if (percentage > 65) statusColor = "bg-accent";
        
        return (
          <div key={budget.id} className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">{budget.category.name}</span>
              <span className="text-sm font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className={`h-2 ${statusColor}`} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                <span className="font-medium">{formatCurrency(budget.spent)}</span> dari {formatCurrency(budget.amount)}
              </span>
              <span>
                Sisa: <span className={remaining < 0 ? "text-destructive font-medium" : "font-medium"}>
                  {formatCurrency(Math.max(remaining, 0))}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}