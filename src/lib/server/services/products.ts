import type { ProductLogDTO } from "#@/lib/DTOs/qurban.ts";
import type { ProdukHewan } from "@/types/qurban";
import { Counter } from "@prisma/client";

// Helper function for optimistic updates
export function applyProductUpdate(product: ProdukHewan, data: ProductLogDTO): ProdukHewan {
  const updated = { ...product }; // Always work with an immutable copy

  switch (data.event) {
    case "menambahkan":
      // Use if/else for conditional assignments
      if (data.place === Counter.TIMBANG) {
        updated.diTimbang += data.value;
      } else if (data.place === Counter.INVENTORY) {
        updated.diInventori += data.value;
      }
      break;

    case "memindahkan":
      // This part was already correct with if/else
      if (data.place === Counter.TIMBANG) {
        updated.diTimbang = Math.max(0, updated.diTimbang - data.value);
      } else if (data.place === Counter.INVENTORY) { // Added else if for clarity, though `else` works if only two places
        updated.diInventori = Math.max(0, updated.diInventori - data.value);
      }
      break;

    case "mengkoreksi":
      // Use if/else for conditional assignments
      if (data.place === Counter.TIMBANG) {
        updated.diTimbang = data.value;
      } else if (data.place === Counter.INVENTORY) {
        updated.diInventori = data.value;
      }
      break;
  }

  return updated;
}

export function applyProductQuantityChange(
  product: ProdukHewan,
  produkId: number, // The ID of the product being targeted
  event: 'memindahkan' | 'menambahkan' | 'mengkoreksi', // Specific events for quantity
  place: Counter, // Where the quantity is being changed
  value: number // The amount of change
): ProdukHewan {
  if (product.id !== produkId) {
    return product; // Only apply update to the matching product
  }
  const updated = { ...product }; // Create an immutable copy

  switch (event) {
    case "memindahkan":
      // Assuming 'memindahkan' from TIMBANG means it goes to INVENTORY
      // This is a crucial assumption based on your original code's logic.
      if (place === Counter.TIMBANG) {
        updated.diTimbang = Math.max(0, updated.diTimbang - value);
        updated.diInventori += value; // Increase inventory as it's moved there
      }
      // Add other 'memindahkan' scenarios if applicable (e.g., between inventory locations)
      break;
    case "menambahkan": // Assuming this means adding to a specific place
      if (place === Counter.TIMBANG) {
        updated.diTimbang += value;
      } else if (place === Counter.INVENTORY) {
        updated.diInventori += value;
      }
      break;
    case "mengkoreksi": // Correcting to an absolute value
      if (place === Counter.TIMBANG) {
        updated.diTimbang = value;
      } else if (place === Counter.INVENTORY) {
        updated.diInventori = value;
      }
      break;
  }
  return updated;
}
