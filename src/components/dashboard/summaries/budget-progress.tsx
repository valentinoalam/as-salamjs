"use client";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "#@/lib/utils/formatters.ts";
import { useFinancialData } from "@/hooks/qurban/use-keuangan";

export function BudgetProgress() {
  const { budgetsQuery } = useFinancialData()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: budgets, isLoading, isError } = budgetsQuery

  if (isLoading) {
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

  if (budgets?.length === 0) {
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
      {budgets?.map((budget) => {
        const spent = budget.spent || 0
        const percentage = Math.min(Math.round((spent / budget.amount) * 100), 100);
        const remaining = budget.amount - spent;
        
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
                <span className="font-medium">{formatCurrency(spent)}</span> dari {formatCurrency(budget.amount)}
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