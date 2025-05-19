"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

import { toast } from "@/hooks/use-toast"
import { HewanStatus, type HewanQurban } from "@prisma/client"
import { Loader2 } from "lucide-react"
import { usePaginationConfig, useQurban, type HewanQuery, type TipeHewan } from "@/contexts/qurban-context"

interface ProgressProps {
  tipeHewan: TipeHewan
  meta: {total: number; target: number};
  queryHewan: HewanQuery;
  currentPage: number; // Adjust type accordingly
  setPage: (key: any, value: any) => void; // Adjust type accordingly
  currentGroup?: string;
}

const ProgressHewan = ({ 
  tipeHewan,
  meta,
  queryHewan,
  currentPage,
  setPage,
  currentGroup
}: ProgressProps) => {
  const  { updateHewan } = useQurban()
  const { data: pagedData, isLoading, isError, refetch, pagination } = queryHewan
  const { useGroups, itemsPerGroup, pageSize, totalPages, totalGroups } = pagination;
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const groupButtons = useMemo(() => 
    Array.from(
      { length: Math.ceil(meta.total / (itemsPerGroup || 50)) }, 
      (_, i) => String.fromCharCode(65 + i)
    ),
    [meta.total, itemsPerGroup]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const pageKey = tipeHewan === 'sapi' ? 'sapiPage' : 'dombaPage';
      setPage(pageKey, page);
    },
    [tipeHewan, setPage]
  );

  const handleGroupChange = useCallback(
    (group: string) => {
      const groupKey = tipeHewan === 'sapi' ? 'sapiGroup' : 'dombaGroup';
      const pageKey = tipeHewan === 'sapi' ? 'sapiPage' : 'dombaPage';
      
      setPage(groupKey, group);
      setPage(pageKey, 1); // Reset to first page when group changes
    },
    [tipeHewan, setPage]
  );

  const handleSlaughteredChange = useCallback( (hewanId: string, checked: boolean, type: "sapi" | "domba") => {
    try {
      setIsUpdating(hewanId);
      // Send to server
      const status = checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR
      console.log(hewanId, status)
      updateHewan({
        hewanId,
        status,
        slaughtered: checked,
        tipeId: type === "sapi" ? 1 : 2,
      })
    } finally {
      setIsUpdating(null) // Move cleanup here
    }

  }, [updateHewan])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Error loading data</p>
          <Button 
            onClick={() => refetch()}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progres {tipeHewan}</CardTitle>
        {/* Pagination Controls */}
        
        <div className="space-y-4">
          { useGroups && totalGroups && totalGroups > 1 && (
            <div className="flex gap-2 flex-wrap">
              {groupButtons.map((group) => (
                <Button
                  key={group}
                  variant={currentGroup === group ? "default" : "outline"}
                  onClick={() => handleGroupChange(group)}
                  disabled={isLoading}
                >
                  {group}
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1
              const start = i * pageSize + 1
              const end = Math.min((i + 1) * pageSize, meta.total)

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isLoading}
                >
                  {start} - {end}
                </Button>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedData.map((hewan: HewanQurban) => (
            <div
              key={hewan.hewanId}
              className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl" aria-label={tipeHewan}>
                  {tipeHewan === "sapi" ? "🐄" : "🐏"}
                </span>
                <span className="font-medium">{hewan.hewanId}</span>
              </div>

              <StatusSwitch
                label="Disembelih"
                checked={hewan.slaughtered}
                onCheckedChange={(checked) => handleSlaughteredChange(hewan.hewanId, checked, tipeHewan)}
                disabled={isUpdating === hewan.hewanId}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const StatusSwitch = ({
  label,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) => (
  <div className="flex items-center gap-2">
    <Switch 
      checked={checked} 
      onCheckedChange={onCheckedChange} 
      disabled={disabled} 
    />
    <Label className="text-sm select-none">
      {checked ? `Sudah ${label}` : `Belum ${label}`}
    </Label>
  </div>
)

export default ProgressHewan