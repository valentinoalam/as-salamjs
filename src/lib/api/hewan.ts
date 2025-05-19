import type { HewanStatus } from "@prisma/client"

// Function to update hewan status
export async function updateHewanStatus(hewanId: number, status: HewanStatus, slaughtered: boolean) {
  try {
    const response = await fetch("/api/hewan/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hewanId, status, slaughtered }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to update hewan status")
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error updating hewan status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Function to update mudhohi received status
export async function updateMudhohiReceived(hewanId: number, received: boolean) {
  try {
    const response = await fetch("/api/hewan/received", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hewanId, received }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to update received status")
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error updating received status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Function to update inventory status
export async function updateHewanInventoryStatus(hewanId: number, onInventory: boolean) {
  try {
    const response = await fetch("/api/hewan/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hewanId, onInventory }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to update inventory status")
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error updating inventory status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
