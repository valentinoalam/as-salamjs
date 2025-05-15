import { NewTransactionForm } from "@/components/transactions/new-transaction-form";

export default function NewTransactionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transaksi Baru</h1>
        <p className="text-sm text-muted-foreground">
          Catat transaksi pemasukan atau pengeluaran
        </p>
      </div>
      
      <NewTransactionForm />
    </div>
  );
}