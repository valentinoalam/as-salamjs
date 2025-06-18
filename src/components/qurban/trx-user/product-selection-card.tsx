import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProdukForAnimal } from "../form/create-produk-hewan-form";
import type { JenisHewan } from "@prisma/client";
import { MultiSelect } from "@/components/multi-select";
import { getJenisProdukLabel } from "../trx-admin/mudhohi-sheet";

interface ProductSelectionCardProps {
  jenisHewan: JenisHewan;
  selectedProducts: string[];
  onChange: (selected: string[]) => void;
}

export function ProductSelectionCard({ 
  jenisHewan,
  selectedProducts, 
  onChange 
}: ProductSelectionCardProps) {
  const products = getProdukForAnimal(jenisHewan)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilih Produk Daging</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiSelect asChild
            options={products.map((h) => ({
              value: h,
              label: h,
              className: '',
              variant: getJenisProdukLabel(h)
            }))}
            onValueChange={(selected) => {
              onChange(selected);
            }}
            value={selectedProducts || []}
            placeholder="Pilih jatah daging (maks. 2)"
            variant="inverted"
            animation={2}
            maxCount={2}
          />
        </div>
        
        {selectedProducts.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Produk Terpilih:</h4>
            <ul className="list-disc pl-5">
              {selectedProducts.map((product, index) => (
                <li key={index}>{product}</li>
              ))}
            </ul>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground">
          Pilih maksimal 2 produk untuk jatah daging Anda
        </p>
      </CardContent>
    </Card>
  );
}