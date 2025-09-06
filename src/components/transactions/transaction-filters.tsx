"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar, Tag, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  type: string;
}

export function TransactionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [fromDate, setFromDate] = useState<Date | undefined>(
    searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined
  );
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  
  useEffect(() => {
    // Check if any filter is applied
    setIsFiltered(
      search !== "" || 
      fromDate !== undefined || 
      toDate !== undefined || 
      selectedCategory !== ""
    );
    
    // Fetch categories for the filter
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/keuangan/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Mock data
        setCategories([
          { id: '1', name: 'Pembelian Hewan Qurban - Sapi', type: 'EXPENSE' },
          { id: '2', name: 'Biaya Distribusi Daging', type: 'EXPENSE' },
          { id: '3', name: 'Donasi Qurban', type: 'INCOME' },
          { id: '4', name: 'Biaya Pemotongan & Pengulitan', type: 'EXPENSE' },
          { id: '5', name: 'Belanja Bumbu & Bahan Masakan', type: 'EXPENSE' },
        ]);
      }
    };
    
    fetchCategories();
  }, [search, fromDate, toDate, selectedCategory, searchParams]);
  
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (search) params.set("q", search);
    if (fromDate) params.set("from", fromDate.toISOString().split('T')[0]);
    if (toDate) params.set("to", toDate.toISOString().split('T')[0]);
    if (selectedCategory) params.set("category", selectedCategory);
    
    router.push(`/transactions?${params.toString()}`);
  };
  
  const resetFilters = () => {
    setSearch("");
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedCategory("");
    router.push("/dashboard/transactions");
  };
  
  return (
    <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm border">
      <div className="text-sm font-medium mb-2">Filter Transaksi</div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Cari</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Cari deskripsi..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Periode</Label>
          <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {fromDate && toDate ? (
                  <>
                    {format(fromDate, "dd MMM yyyy", { locale: id })} - {format(toDate, "dd MMM yyyy", { locale: id })}
                  </>
                ) : (
                  <span>Pilih rentang tanggal</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{
                  from: fromDate,
                  to: toDate,
                }}
                onSelect={(range) => {
                  setFromDate(range?.from);
                  setToDate(range?.to);
                }}
                locale={id}
                initialFocus
              />
              <div className="p-3 border-t border-border flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate(undefined);
                    setToDate(undefined);
                  }}
                >
                  Reset
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setOpenDatePicker(false)}
                >
                  Terapkan
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="category" className="w-full">
              <div className="flex items-center">
                <Tag className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Semua kategori" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {/* Fixed: Added "all" value instead of empty string */}
              <SelectItem value="all">Semua kategori</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end gap-2">
          <Button className="flex-1" onClick={applyFilters}>
            Terapkan Filter
          </Button>
          {isFiltered && (
            <Button variant="outline" size="icon" onClick={resetFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}