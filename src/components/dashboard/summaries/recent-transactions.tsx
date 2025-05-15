"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
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

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    url: string;
  }[];
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/transactions?limit=10');
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        // Mock data for display purposes
        setTransactions([
          {
            id: '1',
            amount: 9000000,
            type: TransactionType.EXPENSE,
            date: new Date().toISOString(),
            description: 'Pembelian sapi qurban dari peternak',
            categoryId: '1',
            category: {
              id: '1',
              name: 'Pembelian Hewan Qurban - Sapi'
            },
            images: [
              {
                id: '1',
                url: 'https://images.pexels.com/photos/422218/pexels-photo-422218.jpeg'
              }
            ]
          },
          {
            id: '2',
            amount: 1500000,
            type: TransactionType.EXPENSE,
            date: new Date().toISOString(),
            description: 'Biaya transportasi dan distribusi daging qurban',
            categoryId: '2',
            category: {
              id: '2',
              name: 'Biaya Distribusi Daging'
            },
            images: [
              {
                id: '2',
                url: 'https://images.pexels.com/photos/4473398/pexels-photo-4473398.jpeg'
              }
            ]
          },
          {
            id: '3',
            amount: 15000000,
            type: TransactionType.INCOME,
            date: new Date().toISOString(),
            description: 'Sumbangan untuk qurban masjid',
            categoryId: '3',
            category: {
              id: '3',
              name: 'Donasi Qurban'
            },
            images: [
              {
                id: '3',
                url: 'https://images.pexels.com/photos/7638274/pexels-photo-7638274.jpeg'
              }
            ]
          },
          {
            id: '4',
            amount: 1250000,
            type: TransactionType.EXPENSE,
            date: new Date().toISOString(),
            description: 'Bayar jasa pemotongan qurban',
            categoryId: '4',
            category: {
              id: '4',
              name: 'Biaya Pemotongan & Pengulitan'
            },
            images: []
          },
          {
            id: '5',
            amount: 750000,
            type: TransactionType.EXPENSE,
            date: new Date().toISOString(),
            description: 'Belanja bumbu dan bahan masakan',
            categoryId: '5',
            category: {
              id: '5',
              name: 'Belanja Bumbu & Bahan Masakan'
            },
            images: [
              {
                id: '5',
                url: 'https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg'
              }
            ]
          },
        ]);
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
              <Avatar className={transaction.type === TransactionType.INCOME ? "bg-green-100" : "bg-red-100"}>
                <AvatarFallback className={transaction.type === TransactionType.INCOME ? "text-green-500" : "text-red-500"}>
                  {transaction.type === TransactionType.INCOME ? (
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
              <span className={transaction.type === TransactionType.INCOME ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {transaction.type === TransactionType.INCOME ? "+" : "-"}
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
                  <Badge variant={viewTransaction.type === TransactionType.INCOME ? "success" : "destructive"}>
                    {viewTransaction.type === TransactionType.INCOME ? "Pemasukan" : "Pengeluaran"}
                  </Badge>
                  <Badge variant="outline">{viewTransaction.category.name}</Badge>
                  <span>{format(new Date(viewTransaction.date), "dd MMMM yyyy")}</span>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-center p-4 rounded-md bg-muted/50">
                <span className={viewTransaction.type === TransactionType.INCOME ? "text-green-600" : "text-red-600"}>
                  {viewTransaction.type === TransactionType.INCOME ? "+" : "-"}
                  {formatCurrency(viewTransaction.amount)}
                </span>
              </div>
              
              {viewTransaction.images.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-2">Foto Bukti:</h4>
                  <ScrollArea className="h-72 rounded-md border">
                    <div className="p-4 space-y-2">
                      {viewTransaction.images.map((image) => (
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