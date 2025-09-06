"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ProductSpriteIcon } from "@/components/product-sprite-img"
import { cn } from "@/lib/utils/utils"

type ProdukHewan = {
  id: number
  nama: string
  berat: number | null
  diInventori: number
  sdhDiserahkan: number
  jenisProduk: string
  tipe_hewan?: {
    id: number
    nama: string
    icon: string | null
  } | null
}

interface ProductCardSelectionProps {
  products: ProdukHewan[]
  selectedProductIds: number[]
  onSelectionChange: (productIds: number[]) => void
  showQuantity?: boolean
  maxSelection?: number
  minSelection?: number
  filterByType?: string
  className?: string
}

export function ProductCardSelection({
  products,
  selectedProductIds,
  onSelectionChange,
  showQuantity = false,
  maxSelection,
  minSelection = 0,
  filterByType,
  className,
}: ProductCardSelectionProps) {
  const [filteredProducts, setFilteredProducts] = useState<ProdukHewan[]>(products)

  useEffect(() => {
    let filtered = products

    if (filterByType) {
      filtered = filtered.filter(
        (product) =>
          product.jenisProduk.toLowerCase().includes(filterByType.toLowerCase()) ||
          product.tipe_hewan?.nama.toLowerCase().includes(filterByType.toLowerCase()),
      )
    }

    // Only show products with available inventory
    filtered = filtered.filter((product) => product.diInventori > 0)

    setFilteredProducts(filtered)
  }, [products, filterByType])

  const handleProductToggle = (productId: number, checked: boolean) => {
    let newSelection = [...selectedProductIds]

    if (checked) {
      // Check max selection limit
      if (maxSelection && newSelection.length >= maxSelection) {
        return
      }
      newSelection.push(productId)
    } else {
      newSelection = newSelection.filter((id) => id !== productId)
    }

    onSelectionChange(newSelection)
  }

  const isSelectionValid =
    selectedProductIds.length >= minSelection && (!maxSelection || selectedProductIds.length <= maxSelection)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selection Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedProductIds.length} dari {filteredProducts.length} produk dipilih
          {maxSelection && ` (max: ${maxSelection})`}
          {minSelection > 0 && ` (min: ${minSelection})`}
        </div>

        <div className="flex items-center space-x-2">
          {!isSelectionValid && (
            <Badge variant="destructive" className="text-xs">
              {selectedProductIds.length < minSelection
                ? `Pilih minimal ${minSelection} produk`
                : `Maksimal ${maxSelection} produk`}
            </Badge>
          )}
          {isSelectionValid && selectedProductIds.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              ✓ Valid
            </Badge>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const isSelected = selectedProductIds.includes(product.id)
          const isDisabled = !isSelected && maxSelection && selectedProductIds.length >= maxSelection

          return (
            <Card
              key={product.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary bg-primary/5",
                isDisabled && "opacity-50 cursor-not-allowed",
              )}
              onClick={() => !isDisabled && handleProductToggle(product.id, !isSelected)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Product Icon */}
                  <div className="flex justify-center">
                    <ProductSpriteIcon productId={product.id} className="w-12 h-12" />
                  </div>

                  {/* Product Info */}
                  <div className="text-center space-y-1">
                    <div className="font-medium text-sm">{product.nama}</div>
                    {product.berat && <div className="text-xs text-muted-foreground">{product.berat}kg</div>}
                    <div className="text-xs text-muted-foreground">{product.tipe_hewan?.nama}</div>
                  </div>

                  {/* Quantity Info */}
                  {showQuantity && (
                    <div className="text-center space-y-1">
                      <div className="text-sm font-medium text-green-600">{product.diInventori} tersedia</div>
                      <div className="text-xs text-muted-foreground">{product.sdhDiserahkan} terdistribusi</div>
                    </div>
                  )}

                  {/* Selection Checkbox */}
                  <div className="flex justify-center">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          !isDisabled && handleProductToggle(product.id, checked as boolean)
                        }
                        disabled={isDisabled as boolean}
                      />
                      <Label htmlFor={`product-${product.id}`} className="text-xs cursor-pointer">
                        Pilih
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-lg mb-2">Tidak ada produk tersedia</div>
          <div className="text-sm">
            {filterByType
              ? `Tidak ada produk ${filterByType} yang tersedia di inventori`
              : "Semua produk sedang tidak tersedia"}
          </div>
        </div>
      )}

      {/* Selected Products Summary */}
      {selectedProductIds.length > 0 && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">Produk Terpilih:</div>
          <div className="space-y-1">
            {selectedProductIds.map((productId) => {
              const product = products.find((p) => p.id === productId)
              if (!product) return null

              return (
                <div key={productId} className="flex items-center justify-between text-sm">
                  <span>{product.nama}</span>
                  {showQuantity && <span className="text-muted-foreground">{product.diInventori} tersedia</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
