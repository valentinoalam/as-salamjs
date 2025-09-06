"use client"

import type React from "react"
import { cn } from "@/lib/utils/utils"
import { getProductIllustration, spritesheetConfig } from "@/lib/product-illustrations"

interface ProductSpriteIconProps {
  productId: string | number
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showTooltip?: boolean
  fallbackIcon?: React.ReactNode
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
}

export function ProductSpriteIcon({
  productId,
  size = "md",
  className,
  showTooltip = false,
  fallbackIcon,
}: ProductSpriteIconProps) {
  const illustration = getProductIllustration(String(productId))

  if (!illustration) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300",
          sizeClasses[size],
          className,
        )}
      >
        {fallbackIcon || <span className="text-gray-400 text-xs font-medium">{size === "sm" ? "?" : "No Icon"}</span>}
      </div>
    )
  }

  const spriteStyle: React.CSSProperties = {
    backgroundImage: `url(${spritesheetConfig.url})`,
    backgroundPosition: `-${illustration.sprite.x}px -${illustration.sprite.y}px`,
    backgroundSize: `${spritesheetConfig.gridSize * 100}% ${spritesheetConfig.gridSize * 100}%`,
    backgroundRepeat: "no-repeat",
  }

  const IconComponent = (
    <div
      className={cn(
        "bg-cover bg-center rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md",
        sizeClasses[size],
        className,
      )}
      style={spriteStyle}
      aria-label={illustration.name}
    />
  )

  if (showTooltip) {
    return (
      <div className="group relative">
        {IconComponent}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {illustration.name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    )
  }

  return IconComponent
}

// Component for displaying product with icon and details
interface ProductCardProps {
  productId: string
  showDetails?: boolean
  onClick?: () => void
  className?: string
}

export function ProductCard({ productId, showDetails = true, onClick, className }: ProductCardProps) {
  const illustration = getProductIllustration(productId)

  if (!illustration) {
    return (
      <div className={cn("p-4 border border-gray-200 rounded-lg bg-gray-50", className)}>
        <div className="text-center text-gray-500">Product not found</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow duration-200",
        onClick && "cursor-pointer hover:border-gray-300",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <ProductSpriteIcon productId={productId} size="lg" showTooltip={false} />

        {showDetails && (
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{illustration.name}</h3>
            <p className="text-sm text-gray-500 truncate">{illustration.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: illustration.color }} />
              <span className="text-xs text-gray-400 uppercase tracking-wide">{illustration.category}</span>
              <span className="text-xs text-gray-400">{illustration.animalType}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Grid component for displaying multiple products
interface ProductGridProps {
  productIds: string[]
  onProductSelect?: (productId: string) => void
  selectedProductId?: string
  className?: string
}

export function ProductGrid({ productIds, onProductSelect, selectedProductId, className }: ProductGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {productIds.map((productId) => (
        <ProductCard
          key={productId}
          productId={productId}
          onClick={() => onProductSelect?.(productId)}
          className={cn(selectedProductId === productId && "ring-2 ring-blue-500 border-blue-500")}
        />
      ))}
    </div>
  )
}
