"use client";

import { useState, useEffect } from "react";
import { TransactionType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "#@/lib/utils/formatters.ts";
import { toast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, PiggyBank } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

interface Budget {
  id: string;
  amount: number;
  categoryId: string;
  category: { 
    id: string;
    name: string;
  };
  startDate: string;
  endDate: string;
}

export function BudgetManagement() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);
  
  const [newBudget, setNewBudget] = useState({
    categoryId: "",
    amount: 0,
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real application, you would fetch from API
        // const [budgetsResponse, categoriesResponse] = await Promise.all([
        //   fetch('/api/budgets'),
        //   fetch('/api/keuangan/categories?type=PENGELUARAN')
        // ]);
        
        // if (budgetsResponse.ok && categoriesResponse.ok) {
        //   const [budgetsData, categoriesData] = await Promise.all([
        //     budgetsResponse.json(),
        //     categoriesResponse.json()
        //   ]);
        //   setBudgets(budgetsData);
        //   setCategories(categoriesData);
        // }
        
        // Mock data
        const mockBudgets = [
          {
            id: '1',
            amount: 10000000,
            categoryId: '1',
            category: {
              id: '1',
              name: 'Pembelian Hewan Qurban - Sapi'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
          {
            id: '2',
            amount: 2000000,
            categoryId: '2',
            category: {
              id: '2',
              name: 'Biaya Distribusi Daging'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
          {
            id: '3',
            amount: 1500000,
            categoryId: '4',
            category: {
              id: '4',
              name: 'Biaya Pemotongan & Pengulitan'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
          {
            id: '4',
            amount: 1000000,
            categoryId: '5',
            category: {
              id: '5',
              name: 'Belanja Bumbu & Bahan Masakan'
            },
            startDate: '2025-07-01',
            endDate: '2025-07-31'
          },
        ];
        
        const mockCategories = [
          { id: '1', name: 'Pembelian Hewan Qurban - Sapi', type: TransactionType.PENGELUARAN },
          { id: '2', name: 'Biaya Distribusi Daging', type: TransactionType.PENGELUARAN },
          { id: '4', name: 'Biaya Pemotongan & Pengulitan', type: TransactionType.PENGELUARAN },
          { id: '5', name: 'Belanja Bumbu & Bahan Masakan', type: TransactionType.PENGELUARAN },
          { id: '9', name: 'Sewa Alat', type: TransactionType.PENGELUARAN },
          { id: '10', name: 'Lain-lain (Pengeluaran)', type: TransactionType.PENGELUARAN },
        ];
        
        setBudgets(mockBudgets);
        setCategories(mockCategories);
      } catch (error) {
        console.error('Failed to fetch budget data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleAddBudget = () => {
    if (!newBudget.categoryId || newBudget.amount <= 0) {
      toast({
        title: "Input tidak valid",
        description: "Pilih kategori dan masukkan jumlah anggaran yang valid.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if budget for category already exists
    if (budgets.some(b => b.categoryId === newBudget.categoryId)) {
      toast({
        title: "Anggaran sudah ada",
        description: "Anggaran untuk kategori ini sudah ada. Silakan edit anggaran yang ada.",
        variant: "destructive",
      });
      return;
    }
    
    const selectedCategory = categories.find(c => c.id === newBudget.categoryId);
    
    if (!selectedCategory) return;
    
    // Create new budget
    const budget: Budget = {
      id: Date.now().toString(), // Generate a temporary ID
      amount: newBudget.amount,
      categoryId: newBudget.categoryId,
      category: {
        id: selectedCategory.id,
        name: selectedCategory.name
      },
      startDate: new Date().toISOString(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    };
    
    // In a real application, you would send this to your API
    // fetch('/api/budgets', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(budget),
    // });
    
    setBudgets([...budgets, budget]);
    setNewBudget({ categoryId: "", amount: 0 });
    setShowNewBudget(false);
    
    toast({
      title: "Anggaran berhasil ditambahkan",
      description: `Anggaran untuk ${selectedCategory.name} berhasil dibuat.`,
    });
  };
  
  const handleUpdateBudget = () => {
    if (!editBudget) return;
    
    // Update budget in the list
    const updatedBudgets = budgets.map(b => 
      b.id === editBudget.id ? editBudget : b
    );
    
    // In a real application, you would send this to your API
    // fetch(`/api/budgets/${editBudget.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(editBudget),
    // });
    
    setBudgets(updatedBudgets);
    setEditBudget(null);
    
    toast({
      title: "Anggaran berhasil diperbarui",
      description: `Anggaran untuk ${editBudget.category.name} berhasil diperbarui.`,
    });
  };
  
  const handleDeleteBudget = () => {
    if (!deleteBudget) return;
    
    // Remove budget from the list
    setBudgets(budgets.filter(b => b.id !== deleteBudget.id));
    
    // In a real application, you would send this to your API
    // fetch(`/api/budgets/${deleteBudget.id}`, {
    //   method: 'DELETE',
    // });
    
    setDeleteBudget(null);
    
    toast({
      title: "Anggaran berhasil dihapus",
      description: `Anggaran untuk ${deleteBudget.category.name} berhasil dihapus.`,
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            <CardTitle>Manajemen Anggaran</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowNewBudget(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Anggaran Baru
          </Button>
        </div>
        <CardDescription>
          Tetapkan anggaran untuk setiap kategori pengeluaran
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-6 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center p-6 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-medium">Belum ada anggaran</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Tetapkan anggaran untuk kategori pengeluaran agar dapat memantau realisasi anggaran.
            </p>
            <Button className="mt-4" onClick={() => setShowNewBudget(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Anggaran
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => (
              <div key={budget.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{budget.category.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Anggaran: {formatCurrency(budget.amount)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setEditBudget(budget)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setDeleteBudget(budget)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* New Budget Dialog */}
      <Dialog open={showNewBudget} onOpenChange={setShowNewBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Anggaran Baru</DialogTitle>
            <DialogDescription>
              Tetapkan anggaran untuk kategori pengeluaran
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={newBudget.categoryId}
                onValueChange={(value) => setNewBudget({ ...newBudget, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(c => !budgets.some(b => b.categoryId === c.id))
                    .map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah Anggaran (Rp)</Label>
              <Input
                id="amount"
                type="number"
                value={newBudget.amount}
                onChange={(e) => setNewBudget({ ...newBudget, amount: parseFloat(e.target.value) })}
                min={0}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBudget(false)}>
              Batal
            </Button>
            <Button onClick={handleAddBudget}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Budget Dialog */}
      <Dialog open={editBudget !== null} onOpenChange={(open) => !open && setEditBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Anggaran</DialogTitle>
            <DialogDescription>
              Perbarui anggaran untuk {editBudget?.category.name}
            </DialogDescription>
          </DialogHeader>
          
          {editBudget && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Jumlah Anggaran (Rp)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editBudget.amount}
                  onChange={(e) => setEditBudget({ ...editBudget, amount: parseFloat(e.target.value) })}
                  min={0}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudget(null)}>
              Batal
            </Button>
            <Button onClick={handleUpdateBudget}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Budget Confirmation */}
      <AlertDialog open={deleteBudget !== null} onOpenChange={(open) => !open && setDeleteBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus anggaran untuk {deleteBudget?.category.name}?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}