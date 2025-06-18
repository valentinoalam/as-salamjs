import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { useQurbanStore } from "@/stores/qurban-store"

export function useStores() {
  const auth = useAuthStore()
  const ui = useUIStore()
  const qurban = useQurbanStore()

  return {
    auth,
    ui,
    qurban,
  }
}

// Individual store hooks for convenience
export { useAuthStore, useUIStore, useQurbanStore }
