"use client"

import { useState, useMemo } from "react"
import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { productIllustrations, searchProducts } from "@/lib/product-illustrations"
import { ProductGrid, ProductSpriteIcon } from "@/components/product-sprite-img"

interface ProductSelectorProps {
  onProductSelect: (productId: string) => void
  selectedProductId?: string
  allowMultiple?: boolean
  selectedProductIds?: string[]
  onMultipleSelect?: (productIds: string[]) => void
  className?: string
}

export function ProductSelector({
  onProductSelect,
  selectedProductId,
  allowMultiple = false,
  selectedProductIds = [],
  onMultipleSelect,
  className,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [animalTypeFilter, setAnimalTypeFilter] = useState<string>("all")

  // Get all unique categories and animal types
  const categories = Array.from(new Set(Object.values(productIllustrations).map((p) => p.category)))
  const animalTypes = Array.from(new Set(Object.values(productIllustrations).map((p) => p.animalType)))

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    let products = Object.values(productIllustrations)

    // Apply search
    if (searchQuery.trim()) {
      products = searchProducts(searchQuery)
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      products = products.filter((p) => p.category === categoryFilter)
    }

    // Apply animal type filter
    if (animalTypeFilter !== "all") {
      products = products.filter((p) => p.animalType === animalTypeFilter)
    }

    return products
  }, [searchQuery, categoryFilter, animalTypeFilter])

  const handleProductClick = (productId: string) => {
    if (allowMultiple && onMultipleSelect) {
      const newSelection = selectedProductIds.includes(productId)
        ? selectedProductIds.filter((id) => id !== productId)
        : [...selectedProductIds, productId]
      onMultipleSelect(newSelection)
    } else {
      onProductSelect(productId)
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setAnimalTypeFilter("all")
  }

  return (
    <div className={className}>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={animalTypeFilter} onValueChange={setAnimalTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Jenis Hewan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Hewan</SelectItem>
              {animalTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || categoryFilter !== "all" || animalTypeFilter !== "all") && (
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Reset Filter
            </Button>
          )}
        </div>

        {/* Selected products display for multiple selection */}
        {allowMultiple && selectedProductIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Terpilih:</span>
            {selectedProductIds.map((productId) => {
              const product = productIllustrations[productId]
              return product ? (
                <Badge key={productId} variant="secondary" className="flex items-center gap-1">
                  <ProductSpriteIcon productId={productId} size="sm" />
                  {product.name}
                  <button
                    onClick={() => handleProductClick(productId)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">Menampilkan {filteredProducts.length} produk</p>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <ProductGrid
          productIds={filteredProducts.map((p) => p.id)}
          onProductSelect={handleProductClick}
          selectedProductId={allowMultiple ? undefined : selectedProductId}
          className="mb-4"
        />
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Tidak ada produk ditemukan</h3>
          <p className="text-gray-500">Coba ubah kata kunci pencarian atau filter</p>
        </div>
      )}
    </div>
  )
}
