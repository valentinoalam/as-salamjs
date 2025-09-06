"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "#@/lib/utils/formatters.ts";
import { ArrowUp, ArrowDown, Eye } from "lucide-react";
import { format } from "date-fns";
import { TransactionType } from "@prisma/client";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLatestTransactions } from "#@/lib/server/repositories/keuangan.ts";

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: Date;
  description: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  receiptUrl: {
    id: string;
    url: string;
  }[];
}
  // qurbanSales={salesReport.perTipeHewan.map((t: { tipeHewanId: any; totalSales: any; nama: any; }) => ({
  //   id: `qurban-${t.tipeHewanId}`,
  //   amount: t.totalSales,
  //   description: `Penjualan ${t.nama}`,
  //   date: new Date(),
  //   type: 'PEMASUKAN'
  // }))}
export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await getLatestTransactions();
        setTransactions(data);
        
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
          <div className="h-5 bg-muted rounded w-20"></div>
        </div>
      ))}
    </div>;
  }

  return (
    <>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-all animate-in"
          >
            <div className="flex items-center gap-4">
              <Avatar className={transaction.type === TransactionType.PEMASUKAN ? "bg-green-100" : "bg-red-100"}>
                <AvatarFallback className={transaction.type === TransactionType.PEMASUKAN ? "text-green-500" : "text-red-500"}>
                  {transaction.type === TransactionType.PEMASUKAN ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium line-clamp-1">{transaction.description}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{format(new Date(transaction.date), "dd MMM yyyy")}</span>
                  <Badge variant="outline">{transaction.category.name}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={transaction.type === TransactionType.PEMASUKAN ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {transaction.type === TransactionType.PEMASUKAN ? "+" : "-"}
                {formatCurrency(transaction.amount)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setViewTransaction(transaction)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={viewTransaction !== null} onOpenChange={(open) => !open && setViewTransaction(null)}>
        <DialogContent className="max-w-md md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Detail Transaksi</DialogTitle>
          </DialogHeader>
          
          {viewTransaction && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">{viewTransaction.description}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant={viewTransaction.type === TransactionType.PEMASUKAN ? "default" : "destructive"}>
                    {viewTransaction.type === TransactionType.PEMASUKAN ? "Pemasukan" : "Pengeluaran"}
                  </Badge>
                  <Badge variant="outline">{viewTransaction.category.name}</Badge>
                  <span>{format(new Date(viewTransaction.date), "dd MMMM yyyy")}</span>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-center p-4 rounded-md bg-muted/50">
                <span className={viewTransaction.type === TransactionType.PEMASUKAN ? "text-green-600" : "text-red-600"}>
                  {viewTransaction.type === TransactionType.PEMASUKAN ? "+" : "-"}
                  {formatCurrency(viewTransaction.amount)}
                </span>
              </div>
              
              {viewTransaction.receiptUrl.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-2">Foto Bukti:</h4>
                  <ScrollArea className="h-72 rounded-md border">
                    <div className="p-4 space-y-2">
                      {viewTransaction.receiptUrl.map((image) => (
                        <div key={image.id} className="relative rounded-md overflow-hidden h-64 w-full">
                          <Image
                            src={image.url}
                            alt="Transaction evidence"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center p-4 bg-muted/50 rounded-md text-muted-foreground">
                  Tidak ada foto bukti
                </div>
              )}
              
              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <Link href={`/transactions/${viewTransaction.id}/edit`}>Edit Transaksi</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}