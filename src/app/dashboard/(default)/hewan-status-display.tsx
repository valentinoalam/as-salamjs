"use client"

import { useQurban } from "@/contexts/qurban-context"
import { Button } from "@/components/ui/button"

interface HewanStatusDisplayProps {
  type: "sapi" | "domba"
}

export default function HewanStatusDisplay({ type }: HewanStatusDisplayProps) {
  const { sapiQuery, dombaQuery } = useQurban()

  const query = type === "sapi" ? sapiQuery : dombaQuery
  const { data, isLoading, isError, pagination } = query

  if (isLoading) {
    return <div className="text-center p-4">Loading...</div>
  }

  if (isError) {
    return <div className="text-center p-4 text-red-500">Error loading data</div>
  }

  const renderPaginationButtons = () => {
    if (pagination.useGroups) {
      return (
        <div className="space-y-2">
          {/* Group buttons */}
          <div className="flex flex-wrap gap-2 mb-4 justify-end">
            {Array.from({ length: pagination.totalGroups || 0 }, (_, i) => String.fromCharCode(65 + i)).map((group) => (
              <Button
                key={group}
                variant={pagination.currentGroup === group ? "default" : "outline"}
                size="sm"
                onClick={() => query.refetch({ group })}
                disabled={isLoading}
              >
                Group {group}
              </Button>
            ))}
          </div>
          {/* Page buttons */}
          <div className="flex flex-wrap gap-2 mb-4 justify-end">
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <Button
                key={i}
                variant={pagination.currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => query.refetch({ page: i + 1 })}
                disabled={isLoading}
              >
                {i * pagination.pageSize + 1}-{Math.min((i + 1) * pagination.pageSize, pagination.itemsPerGroup || 50)}
              </Button>
            ))}
          </div>
        </div>
      )
    } else {
      return (
        <div className="flex flex-wrap gap-2 mb-4 justify-end">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <Button
              key={i}
              variant={pagination.currentPage === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => query.refetch({ page: i + 1 })}
              disabled={isLoading}
            >
              {i * pagination.pageSize + 1}-
              {Math.min((i + 1) * pagination.pageSize, pagination.totalPages * pagination.pageSize)}
            </Button>
          ))}
        </div>
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Pagination controls */}
      {renderPaginationButtons()}

      {/* Animal status display */}
      <div className="grid grid-cols-5 gap-2">
        {data.map((hewan) => (
          <div key={hewan.hewanId} className="flex flex-col items-center justify-center p-2 border rounded-md">
            <span className="text-lg">
              {type === "sapi" ? "🐮" : "🐑"}
              {hewan.hewanId}
            </span>
            <div className="flex flex-col items-center">
              <span className="text-2xl">{hewan.slaughtered ? "✅" : "⬜️"}</span>
              {hewan.slaughtered && (
                <>
                  <span className="text-xs mt-1">{hewan.receivedByMdhohi ? "🧑‍🤝‍🧑✓" : "🧑‍🤝‍🧑✗"}</span>
                  <span className="text-xs mt-1">{hewan.onInventory ? "📦✓" : "📦✗"}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
