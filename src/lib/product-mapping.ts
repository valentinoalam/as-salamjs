import { productIllustrations, type ProductIllustration } from "./product-illustrations"

// Define the mapping keywords for each category
const PRODUCT_KEYWORDS = {
  DAGING: ["daging", "karkas", "torpedo"],
  KAKI: ["kaki", "kaki belakang"],
  JEROAN: ["jeroan", "hati", "paru", "usus", "limpa", "ginjal"],
  KULIT: ["kulit"],
  TULANG: ["tulang", "rusuk"],
  KEPALA: ["kepala"],
  LEMAK: ["lemak", "gajih"],
  BUNTUT: ["buntut", "ekor"],
} as const

// Define animal type keywords
const ANIMAL_KEYWORDS = {
  SAPI: ["sapi", "cow", "beef"],
  DOMBA: ["domba", "sheep", "lamb"],
  KAMBING: ["kambing", "goat"],
  UNTA: ["unta", "camel"],
} as const

// Type definitions
export type ProductCategory = keyof typeof PRODUCT_KEYWORDS
export type AnimalType = keyof typeof ANIMAL_KEYWORDS

export interface ProductMapping {
  productId: string
  productName: string
  detectedAnimalType: AnimalType | null
  detectedCategory: ProductCategory | null
  matchedIllustration: ProductIllustration | null
  confidence: number
  fallbackOptions: ProductIllustration[]
}

export interface MappingResult {
  mappings: ProductMapping[]
  unmappedProducts: string[]
  statistics: {
    totalProducts: number
    mappedProducts: number
    unmappedProducts: number
    confidenceDistribution: Record<string, number>
  }
}

/**
 * Detects animal type from product name or explicit jenis hewan
 */
export function detectAnimalType(
  productName: string,
  jenisHewan?: string | null,
): { animalType: AnimalType | null; confidence: number } {
  const name = productName.toLowerCase()

  // First check explicit jenis hewan if provided
  if (jenisHewan) {
    const jenisLower = jenisHewan.toLowerCase()
    for (const [animalType, keywords] of Object.entries(ANIMAL_KEYWORDS)) {
      if (keywords.some((keyword) => jenisLower.includes(keyword))) {
        return { animalType: animalType as AnimalType, confidence: 1.0 }
      }
    }
  }

  // Then check product name
  let bestMatch: AnimalType | null = null
  let highestScore = 0

  for (const [animalType, keywords] of Object.entries(ANIMAL_KEYWORDS)) {
    const matches = keywords.filter((keyword) => name.includes(keyword))
    const score = matches.length / keywords.length

    if (score > highestScore) {
      highestScore = score
      bestMatch = animalType as AnimalType
    }
  }

  return { animalType: bestMatch, confidence: highestScore }
}

/**
 * Detects product category from product name or explicit jenis produk
 */
export function detectProductCategory(
  productName: string,
  jenisProduk?: string | null,
): { category: ProductCategory | null; confidence: number } {
  const name = productName.toLowerCase()

  // First check explicit jenis produk if provided
  if (jenisProduk) {
    const jenisUpper = jenisProduk.toUpperCase()
    if (jenisUpper in PRODUCT_KEYWORDS) {
      return { category: jenisUpper as ProductCategory, confidence: 1.0 }
    }
  }

  // Then check product name for keywords
  let bestMatch: ProductCategory | null = null
  let highestScore = 0

  for (const [category, keywords] of Object.entries(PRODUCT_KEYWORDS)) {
    const matches = keywords.filter((keyword) => name.includes(keyword))
    if (matches.length > 0) {
      const score = matches.length / keywords.length
      if (score > highestScore) {
        highestScore = score
        bestMatch = category as ProductCategory
      }
    }
  }

  return { category: bestMatch, confidence: highestScore }
}

/**
 * Finds the best matching illustration for a product
 */
export function findBestIllustration(
  animalType: AnimalType | null,
  category: ProductCategory | null,
  productName: string,
): { illustration: ProductIllustration | null; confidence: number; fallbacks: ProductIllustration[] } {
  const allIllustrations = Object.values(productIllustrations)

  if (!animalType || !category) {
    return { illustration: null, confidence: 0, fallbacks: [] }
  }

  // Find exact matches
  const exactMatches = allIllustrations.filter((ill) => ill.animalType === animalType && ill.category === category)

  if (exactMatches.length > 0) {
    // Find the best match by name similarity
    const nameMatches = exactMatches.map((ill) => ({
      illustration: ill,
      similarity: calculateNameSimilarity(productName, ill.name),
    }))

    nameMatches.sort((a, b) => b.similarity - a.similarity)
    const bestMatch = nameMatches[0]

    return {
      illustration: bestMatch.illustration,
      confidence: 0.9 + bestMatch.similarity * 0.1,
      fallbacks: nameMatches.slice(1).map((m) => m.illustration),
    }
  }

  // Find partial matches (same animal type, different category)
  const animalMatches = allIllustrations.filter((ill) => ill.animalType === animalType)

  if (animalMatches.length > 0) {
    return {
      illustration: animalMatches[0],
      confidence: 0.6,
      fallbacks: animalMatches.slice(1),
    }
  }

  // Find category matches (same category, different animal)
  const categoryMatches = allIllustrations.filter((ill) => ill.category === category)

  return {
    illustration: categoryMatches[0] || null,
    confidence: categoryMatches.length > 0 ? 0.4 : 0,
    fallbacks: categoryMatches.slice(1),
  }
}

/**
 * Calculates name similarity between two strings
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const words1 = name1.toLowerCase().split(/\s+/)
  const words2 = name2.toLowerCase().split(/\s+/)

  let matches = 0
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        matches++
        break
      }
    }
  }

  return matches / Math.max(words1.length, words2.length)
}

/**
 * Main function to create product mapping tree
 */
export function createProductMappingTree(
  products: Array<{
    id: number
    nama: string
    jenisProduk?: string | null
    tipe_hewan?: { jenis?: string } | null
  }>,
): MappingResult {
  const mappings: ProductMapping[] = []
  const unmappedProducts: string[] = []

  for (const product of products) {
    const productId = product.id.toString()
    const productName = product.nama
    const jenisHewan = product.tipe_hewan?.jenis || null
    const jenisProduk = product.jenisProduk || null

    // Detect animal type
    const { animalType, confidence: animalConfidence } = detectAnimalType(productName, jenisHewan)

    // Detect product category
    const { category, confidence: categoryConfidence } = detectProductCategory(productName, jenisProduk)

    // Find best illustration
    const {
      illustration,
      confidence: illustrationConfidence,
      fallbacks,
    } = findBestIllustration(animalType, category, productName)

    // Calculate overall confidence
    const overallConfidence = (animalConfidence + categoryConfidence + illustrationConfidence) / 3

    const mapping: ProductMapping = {
      productId,
      productName,
      detectedAnimalType: animalType,
      detectedCategory: category,
      matchedIllustration: illustration,
      confidence: overallConfidence,
      fallbackOptions: fallbacks,
    }

    mappings.push(mapping)

    if (!illustration || overallConfidence < 0.5) {
      unmappedProducts.push(productName)
    }
  }

  // Calculate statistics
  const mappedCount = mappings.filter((m) => m.matchedIllustration && m.confidence >= 0.5).length
  const confidenceDistribution = {
    high: mappings.filter((m) => m.confidence >= 0.8).length,
    medium: mappings.filter((m) => m.confidence >= 0.5 && m.confidence < 0.8).length,
    low: mappings.filter((m) => m.confidence < 0.5).length,
  }

  return {
    mappings,
    unmappedProducts,
    statistics: {
      totalProducts: products.length,
      mappedProducts: mappedCount,
      unmappedProducts: unmappedProducts.length,
      confidenceDistribution,
    },
  }
}

/**
 * Get illustration ID for a product (for use in components)
 */
export function getProductIllustrationId(
  productName: string,
  jenisProduk?: string | null,
  jenisHewan?: string | null,
): string | null {
  const { animalType } = detectAnimalType(productName, jenisHewan)
  const { category } = detectProductCategory(productName, jenisProduk)

  if (!animalType || !category) return null

  // Generate illustration ID based on pattern
  const animalPrefix = animalType.toLowerCase()
  const categoryPrefix = category.toLowerCase()

  // Try to find exact match first
  const exactId = `${categoryPrefix}-${animalPrefix}`
  if (productIllustrations[exactId]) {
    return exactId
  }

  // Try variations
  const variations = [
    `${categoryPrefix}-${animalPrefix}-1kg`,
    `${categoryPrefix}-${animalPrefix}-2kg`,
    `${categoryPrefix}-${animalPrefix}-3kg`,
    `${categoryPrefix}-${animalPrefix}-5kg`,
  ]

  for (const variation of variations) {
    if (productIllustrations[variation]) {
      return variation
    }
  }

  return null
}

/**
 * Batch update product illustrations based on mapping
 */
export function generateIllustrationUpdates(mappings: ProductMapping[]): Array<{
  productId: string
  illustrationId: string | null
  confidence: number
}> {
  return mappings.map((mapping) => ({
    productId: mapping.productId,
    illustrationId: mapping.matchedIllustration?.id || null,
    confidence: mapping.confidence,
  }))
}
