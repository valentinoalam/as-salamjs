"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TransactionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { ArrowUp, ArrowDown, Edit, MoreHorizontal, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  type: TransactionType;
  transactionCount: number;
}

interface CategoryListProps {
  type: 'ALL' | 'PEMASUKAN' | 'PENGELUARAN';
}

export function CategoryList({ type }: CategoryListProps) {
  // const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        // In a real application, you would fetch categories from your API
        const response = await fetch(`/api/keuangan/categories?type=${type !== 'ALL' ? type : ''}`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast({
          title: "Gagal memuat kategori",
          description: "Terjadi kesalahan saat memuat daftar kategori.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [type]);
  
  const handleDelete = async () => {
    if (!deleteCategory) return;
    
    if (deleteCategory.transactionCount > 0) {
      toast({
        title: "Kategori tidak dapat dihapus",
        description: "Kategori ini digunakan oleh beberapa transaksi. Ubah atau hapus transaksi terkait terlebih dahulu.",
        variant: "destructive",
      });
      setDeleteCategory(null);
      return;
    }
    
    try {
      // In a real application, you would call your API to delete the category
      // await fetch(`/api/keuangan/categories/${deleteCategory.id}`, {
      //   method: 'DELETE',
      // });
      
      // Update UI
      setCategories(categories.filter(c => c.id !== deleteCategory.id));
      toast({
        title: "Kategori berhasil dihapus",
        description: `Kategori "${deleteCategory.name}" telah dihapus.`,
      });
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        title: "Gagal menghapus kategori",
        description: "Terjadi kesalahan saat menghapus kategori.",
        variant: "destructive",
      });
    } finally {
      setDeleteCategory(null);
    }
  };
  
  if (loading) {
    return <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-12 bg-muted rounded animate-pulse w-full" />
      ))}
    </div>;
  }
  
  if (categories.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-card">
        <h3 className="text-lg font-medium">
          {type === 'ALL' 
            ? 'Tidak ada kategori' 
            : type === 'PEMASUKAN' 
              ? 'Tidak ada kategori pemasukan' 
              : 'Tidak ada kategori pengeluaran'
          }
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Tambahkan kategori baru untuk mengorganisir transaksi dengan lebih baik.
        </p>
        <Button asChild className="mt-4">
          <Link href="/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Kategori Baru
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
              <TableHead>Nama Kategori</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Jumlah Transaksi</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                  <Badge 
                    variant={category.type === TransactionType.PEMASUKAN ? "default" : "destructive"}
                    className="flex items-center w-fit"
                  >
                    {category.type === TransactionType.PEMASUKAN ? (
                      <>
                        <ArrowUp className="mr-1 h-3 w-3" />
                        Pemasukan
                      </>
                    ) : (
                      <>
                        <ArrowDown className="mr-1 h-3 w-3" />
                        Pengeluaran
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>{category.transactionCount}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/categories/${category.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive" 
                        onClick={() => setDeleteCategory(category)}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteCategory !== null} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              {Number(deleteCategory?.transactionCount) > 0 ? (
                <span className="text-destructive font-medium">
                  Kategori ini tidak dapat dihapus karena digunakan oleh {deleteCategory?.transactionCount} transaksi.
                  Ubah atau hapus transaksi terkait terlebih dahulu.
                </span>
              ) : (
                <span>
                  Apakah Anda yakin ingin menghapus kategori &quot;{deleteCategory?.name}&quot;? 
                  Tindakan ini tidak dapat dibatalkan.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            {deleteCategory?.transactionCount === 0 && (
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Hapus
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}