"use client"

import { useQurban } from "@/contexts/qurban-context"

export function ConnectionStatus() {
  const { isConnected } = useQurban()

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
      <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
    </div>
  )
}
