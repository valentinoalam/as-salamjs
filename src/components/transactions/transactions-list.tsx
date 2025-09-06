"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { TransactionType } from "@prisma/client";
import { formatCurrency } from "#@/lib/utils/formatters.ts";
import { cn } from "#@/lib/utils/utils.ts";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2, ImageIcon, Plus } from "lucide-react";

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

interface TransactionsListProps {
  type: 'ALL' | 'PEMASUKAN' | 'PENGELUARAN';
}

export function TransactionsList({ type }: TransactionsListProps) {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);
  
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        // Prepare query params
        const params = new URLSearchParams();
        if (type !== 'ALL') params.set('type', type);
        
        // Add search params
        const search = searchParams.get('q');
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');
        const category = searchParams.get('category');
        
        if (search) params.set('q', search);
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
        if (category) params.set('category', category);
        
        const response = await fetch(`/api/keuangan/transactions?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [type, searchParams]);

  const handleDelete = async () => {
    if (!deleteTransaction) return;
    
    try {
      // In a real application, you would call the API to delete the transaction
      await fetch(`/api/keuangan/transactions/${deleteTransaction.id}`, {
        method: 'DELETE',
      });
      
      // Update the UI
      setTransactions(transactions.filter(t => t.id !== deleteTransaction.id));
      setDeleteTransaction(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="w-full h-12 bg-muted rounded animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-full h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-card">
        <h3 className="text-lg font-medium">Tidak ada transaksi</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Belum ada transaksi yang dicatat. Tambahkan transaksi baru untuk memulai.
        </p>
        <Button asChild className="mt-4">
          <Link href="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            Transaksi Baru
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {format(new Date(transaction.date), "dd MMM yyyy", { locale: id })}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate" title={transaction.description}>
                    {transaction.description}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{transaction.category.name}</Badge>
                </TableCell>
                <TableCell>
                  {transaction.images && transaction.images.length > 0 ? (
                    <Badge variant="secondary">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {transaction.images.length}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-medium",
                  transaction.type === TransactionType.PEMASUKAN ? "text-green-600" : "text-red-600"
                )}>
                  {transaction.type === TransactionType.PEMASUKAN ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewTransaction(transaction)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Detail</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/transactions/${transaction.id}/edit`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive" 
                        onClick={() => setDeleteTransaction(transaction)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Hapus</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Transaction detail dialog */}
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
                  <span>{format(new Date(viewTransaction.date), "dd MMMM yyyy", { locale: id })}</span>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-center p-4 rounded-md bg-muted/50">
                <span className={viewTransaction.type === TransactionType.PEMASUKAN ? "text-green-600" : "text-red-600"}>
                  {viewTransaction.type === TransactionType.PEMASUKAN ? "+" : "-"}
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
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/transactions/${viewTransaction.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button variant="destructive" onClick={() => {
                  setViewTransaction(null);
                  setDeleteTransaction(viewTransaction);
                }}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteTransaction !== null} onOpenChange={(open) => !open && setDeleteTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}