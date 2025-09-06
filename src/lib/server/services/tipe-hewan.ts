import type { TipeHewan } from "@prisma/client";

export const JenisHewan = {
  UNTA: 'UNTA',
  SAPI: 'SAPI', 
  DOMBA: 'DOMBA',
  KAMBING: 'KAMBING',
} as const;

export const JenisProduk = {
  Daging: "Daging",
  Kaki: "Kaki",
  Karkas: "Karkas",
  Jeroan: "Jeroan",
  Kulit: "Kulit",
  Tulang: "Tulang",
  Kepala: "Kepala",
  Lemak: "Lemak",
  Buntut: "Buntut",
  Torpedo: "Torpedo",
} as const;

export const jenisProduk = Object.values(JenisProduk);

export type AnimalType = keyof typeof JenisHewan;
export type ProdukType = keyof typeof JenisProduk;
export type SelectableAnimalType = AnimalType | "";
export type SelectableProductType = ProdukType | "";

export interface ProdukHewanForm {
  jenisHewan: SelectableAnimalType;
  jenisProduk: SelectableProductType;
  berat?: string;
  customName?: string;
  target?: string;
}

export const BigAnimalTypes = ["SAPI", "UNTA"];
// Produk yang termasuk dalam BigAnimal (semua kecuali "Karkas")
export const JenisProdukBigAnimal: ReadonlyArray<Exclude<ProdukType, "Karkas">> = jenisProduk.filter(
  (produk: string) => produk !== "Karkas"
) as ReadonlyArray<Exclude<ProdukType, "Karkas">>;
export function getProdukForAnimal(animal: string): ReadonlyArray<ProdukType> | ReadonlyArray<Exclude<ProdukType, "Karkas">> {
  if (BigAnimalTypes.includes(animal as typeof BigAnimalTypes[number])) {
    return JenisProdukBigAnimal;
  } else 
    return jenisProduk;
}
// Production estimation logic
export const getProductionEstimate = (jenisHewan: AnimalType, jenisProduk: ProdukType) => {
  const isBigAnimal = BigAnimalTypes.includes(jenisHewan);
  
  const productionRules: Record<ProdukType, number> = {
    Daging: isBigAnimal ? 8 : 4,
    Kaki: isBigAnimal ? 4 : 1,
    Karkas: 1,
    Jeroan: 1,
    Kulit: 1,
    Tulang: isBigAnimal ? 6 : 3,
    Kepala: 1,
    Lemak: isBigAnimal ? 4 : 2,
    Buntut: 1,
    Torpedo: isBigAnimal ? 2 : 1
  };
  
  return productionRules[jenisProduk] || 1;
};

// Weight estimation for meat products
export const getDefaultWeight = (jenisHewan: AnimalType, jenisProduk: ProdukType) => {
  if (jenisProduk !== "Daging") return null;
  
  const weightRules: Record<AnimalType, number> = {
    SAPI: 5,
    UNTA: 6,
    DOMBA: 3,
    KAMBING: 3
  };
  
  return weightRules[jenisHewan] || 3;
};

// Generate product name
export const generateProductName = (jenisHewan: AnimalType, jenisProduk: ProdukType, berat: number | null = null) => {
  const hewanName = jenisHewan.charAt(0) + jenisHewan.slice(1).toLowerCase();
  
  if (jenisProduk === "Daging" && berat) {
    return `${JenisProduk[jenisProduk]} ${hewanName} ${berat}kg`;
  }
  
  return `${JenisProduk[jenisProduk]} ${hewanName}`;
};

// Check if product is available for animal type
// const isProductAvailable = (jenisHewan: SelectableAnimalType, jenisProduk: SelectableProductType) => {
//   if (!jenisHewan) return false;
  
//   const isBigAnimal = BigAnimalTypes.includes(jenisHewan);
  
//   // Small animals don't produce Karkas as separate product
//   if (isBigAnimal && jenisProduk === "Karkas") {
//     return false;
//   }
  
//   return true;
// };

export function processTipeHewanData(tipeHewan: TipeHewan[]): {
  uniqueJenis: Set<string>;
  accumulatedTargetsByJenis: Map<string, number[]>;
} {
  // Use reduce to iterate and build both the Set and the Map
  const { uniqueJenis, accumulatedTargetsByJenis } = tipeHewan.reduce(
    (accumulator, item) => {
      // Add the current item's 'jenis' to the Set
      accumulator.uniqueJenis.add(item.jenis);

      // Get the array of targets for the current 'jenis' from the map.
      // If it doesn't exist, initialize it as an empty array.
      const currentTargets = accumulator.accumulatedTargetsByJenis.get(item.jenis) || [];

      // Add the current item's 'target' to the array
      currentTargets.push(item.target);

      // Update the Map with the potentially new or updated array of targets for this 'jenis'
      accumulator.accumulatedTargetsByJenis.set(item.jenis, currentTargets);

      // Return the updated accumulator for the next iteration
      return accumulator;
    },
    { // Initial accumulator value
      uniqueJenis: new Set<string>(),
      accumulatedTargetsByJenis: new Map<string, number[]>(),
    }
  );

  return {
    uniqueJenis,
    accumulatedTargetsByJenis
  };
}