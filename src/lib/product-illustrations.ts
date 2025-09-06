export interface SpritePosition {
  x: number
  y: number
  width: number
  height: number
}

export interface ProductIllustration {
  id: string
  name: string
  category: "DAGING" | "TULANG" | "JEROAN" | "KULIT" | "KEPALA" | "KAKI"
  animalType: "SAPI" | "DOMBA" | "KAMBING" | "UNTA"
  sprite: SpritePosition
  color: string
  description: string
}

// Spritesheet configuration (assuming 128x128 sprites in a 8x8 grid)
const SPRITE_SIZE = 128
const GRID_SIZE = 8
const SPRITESHEET_URL = "/images/product-sprites.png"

// Helper function to calculate sprite position
const getSprite = (row: number, col: number): SpritePosition => ({
  x: col * SPRITE_SIZE,
  y: row * SPRITE_SIZE,
  width: SPRITE_SIZE,
  height: SPRITE_SIZE,
})

// Product illustrations mapped to spritesheet grid positions
export const productIllustrations: Record<string, ProductIllustration> = {
  // DAGING - Row 0
  "daging-sapi-5kg": {
    id: "daging-sapi-5kg",
    name: "Daging Sapi 5kg",
    category: "DAGING",
    animalType: "SAPI",
    sprite: getSprite(0, 0),
    color: "#DC2626",
    description: "Daging sapi premium 5 kilogram",
  },
  "daging-sapi-3kg": {
    id: "daging-sapi-3kg",
    name: "Daging Sapi 3kg",
    category: "DAGING",
    animalType: "SAPI",
    sprite: getSprite(0, 1),
    color: "#DC2626",
    description: "Daging sapi premium 3 kilogram",
  },
  "daging-sapi-1kg": {
    id: "daging-sapi-1kg",
    name: "Daging Sapi 1kg",
    category: "DAGING",
    animalType: "SAPI",
    sprite: getSprite(0, 2),
    color: "#DC2626",
    description: "Daging sapi premium 1 kilogram",
  },
  "daging-domba-2kg": {
    id: "daging-domba-2kg",
    name: "Daging Domba 2kg",
    category: "DAGING",
    animalType: "DOMBA",
    sprite: getSprite(0, 3),
    color: "#EF4444",
    description: "Daging domba segar 2 kilogram",
  },
  "daging-kambing-2kg": {
    id: "daging-kambing-2kg",
    name: "Daging Kambing 2kg",
    category: "DAGING",
    animalType: "KAMBING",
    sprite: getSprite(0, 4),
    color: "#F87171",
    description: "Daging kambing segar 2 kilogram",
  },
  "daging-unta-3kg": {
    id: "daging-unta-3kg",
    name: "Daging Unta 3kg",
    category: "DAGING",
    animalType: "UNTA",
    sprite: getSprite(0, 5),
    color: "#B91C1C",
    description: "Daging unta premium 3 kilogram",
  },

  // JEROAN - Row 1
  "jeroan-sapi": {
    id: "jeroan-sapi",
    name: "Jeroan Sapi",
    category: "JEROAN",
    animalType: "SAPI",
    sprite: getSprite(1, 0),
    color: "#7C2D12",
    description: "Jeroan sapi lengkap",
  },
  "jeroan-domba": {
    id: "jeroan-domba",
    name: "Jeroan Domba",
    category: "JEROAN",
    animalType: "DOMBA",
    sprite: getSprite(1, 1),
    color: "#92400E",
    description: "Jeroan domba segar",
  },
  "jeroan-kambing": {
    id: "jeroan-kambing",
    name: "Jeroan Kambing",
    category: "JEROAN",
    animalType: "KAMBING",
    sprite: getSprite(1, 2),
    color: "#A16207",
    description: "Jeroan kambing segar",
  },
  "hati-sapi": {
    id: "hati-sapi",
    name: "Hati Sapi",
    category: "JEROAN",
    animalType: "SAPI",
    sprite: getSprite(1, 3),
    color: "#991B1B",
    description: "Hati sapi segar",
  },
  "paru-sapi": {
    id: "paru-sapi",
    name: "Paru Sapi",
    category: "JEROAN",
    animalType: "SAPI",
    sprite: getSprite(1, 4),
    color: "#7F1D1D",
    description: "Paru sapi segar",
  },

  // TULANG - Row 2
  "tulang-sapi": {
    id: "tulang-sapi",
    name: "Tulang Sapi",
    category: "TULANG",
    animalType: "SAPI",
    sprite: getSprite(2, 0),
    color: "#F3F4F6",
    description: "Tulang sapi untuk kaldu",
  },
  "tulang-domba": {
    id: "tulang-domba",
    name: "Tulang Domba",
    category: "TULANG",
    animalType: "DOMBA",
    sprite: getSprite(2, 1),
    color: "#E5E7EB",
    description: "Tulang domba untuk kaldu",
  },
  "tulang-kambing": {
    id: "tulang-kambing",
    name: "Tulang Kambing",
    category: "TULANG",
    animalType: "KAMBING",
    sprite: getSprite(2, 2),
    color: "#D1D5DB",
    description: "Tulang kambing untuk kaldu",
  },
  "tulang-rusuk-sapi": {
    id: "tulang-rusuk-sapi",
    name: "Tulang Rusuk Sapi",
    category: "TULANG",
    animalType: "SAPI",
    sprite: getSprite(2, 3),
    color: "#F9FAFB",
    description: "Tulang rusuk sapi",
  },

  // KULIT - Row 3
  "kulit-sapi": {
    id: "kulit-sapi",
    name: "Kulit Sapi",
    category: "KULIT",
    animalType: "SAPI",
    sprite: getSprite(3, 0),
    color: "#78350F",
    description: "Kulit sapi untuk kerupuk",
  },
  "kulit-domba": {
    id: "kulit-domba",
    name: "Kulit Domba",
    category: "KULIT",
    animalType: "DOMBA",
    sprite: getSprite(3, 1),
    color: "#92400E",
    description: "Kulit domba",
  },
  "kulit-kambing": {
    id: "kulit-kambing",
    name: "Kulit Kambing",
    category: "KULIT",
    animalType: "KAMBING",
    sprite: getSprite(3, 2),
    color: "#A16207",
    description: "Kulit kambing",
  },

  // KEPALA - Row 4
  "kepala-sapi": {
    id: "kepala-sapi",
    name: "Kepala Sapi",
    category: "KEPALA",
    animalType: "SAPI",
    sprite: getSprite(4, 0),
    color: "#374151",
    description: "Kepala sapi lengkap",
  },
  "kepala-domba": {
    id: "kepala-domba",
    name: "Kepala Domba",
    category: "KEPALA",
    animalType: "DOMBA",
    sprite: getSprite(4, 1),
    color: "#4B5563",
    description: "Kepala domba lengkap",
  },
  "kepala-kambing": {
    id: "kepala-kambing",
    name: "Kepala Kambing",
    category: "KEPALA",
    animalType: "KAMBING",
    sprite: getSprite(4, 2),
    color: "#6B7280",
    description: "Kepala kambing lengkap",
  },

  // KAKI - Row 5
  "kaki-sapi": {
    id: "kaki-sapi",
    name: "Kaki Sapi",
    category: "KAKI",
    animalType: "SAPI",
    sprite: getSprite(5, 0),
    color: "#1F2937",
    description: "Kaki sapi untuk sop",
  },
  "kaki-domba": {
    id: "kaki-domba",
    name: "Kaki Domba",
    category: "KAKI",
    animalType: "DOMBA",
    sprite: getSprite(5, 1),
    color: "#374151",
    description: "Kaki domba untuk sop",
  },
  "kaki-kambing": {
    id: "kaki-kambing",
    name: "Kaki Kambing",
    category: "KAKI",
    animalType: "KAMBING",
    sprite: getSprite(5, 2),
    color: "#4B5563",
    description: "Kaki kambing untuk sop",
  },
}

// Helper functions
export const getProductIllustration = (productId: string): ProductIllustration | null => {
  return productIllustrations[productId] || null
}

export const getProductsByCategory = (category: ProductIllustration["category"]): ProductIllustration[] => {
  return Object.values(productIllustrations).filter((product) => product.category === category)
}

export const getProductsByAnimalType = (animalType: ProductIllustration["animalType"]): ProductIllustration[] => {
  return Object.values(productIllustrations).filter((product) => product.animalType === animalType)
}

export const searchProducts = (query: string): ProductIllustration[] => {
  const lowercaseQuery = query.toLowerCase()
  return Object.values(productIllustrations).filter(
    (product) =>
      product.name.toLowerCase().includes(lowercaseQuery) || product.description.toLowerCase().includes(lowercaseQuery),
  )
}

// Spritesheet configuration
export const spritesheetConfig = {
  url: SPRITESHEET_URL,
  spriteSize: SPRITE_SIZE,
  gridSize: GRID_SIZE,
  totalSprites: GRID_SIZE * GRID_SIZE,
}
