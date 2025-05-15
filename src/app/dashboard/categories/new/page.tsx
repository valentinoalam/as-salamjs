import { NewCategoryForm } from "@/components/categories/new-category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kategori Baru</h1>
        <p className="text-sm text-muted-foreground">
          Tambahkan kategori baru untuk transaksi
        </p>
      </div>
      
      <NewCategoryForm />
    </div>
  );
}