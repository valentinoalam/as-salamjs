/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { HewanStatus, type HewanQurban } from "@prisma/client"
import { Loader2 } from "lucide-react"
import { useQurban } from "@/hooks/qurban/use-qurban"
import type { HewanQueryResult } from "#@/types/qurban.ts"
import type { JenisHewanInputDTO } from "#@/lib/DTOs/mudhohi.ts"
import { TableSkeleton } from "../table-skeleton"
import { useSettingsStore } from "#@/stores/settings-store.ts"

interface ProgressProps {
  tipeHewan: JenisHewanInputDTO
  meta: {total: number; target: number};
  queryHewan: HewanQueryResult;
  currentPage: number;
  setPage: (key: any, value: any) => void;
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
  const { updateHewan } = useQurban()
  const { data, isLoading, isError, refetch, pagination } = queryHewan;
  const { itemsPerGroup } = useSettingsStore()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  // Calculate groups and pages
  const { useGroups, pageSize, totalPages, totalGroups } = pagination;
  
  const groupButtons = useMemo(() => 
    Array.from(
      { length: Math.ceil(meta.total / itemsPerGroup) }, 
      (_, i) => String.fromCharCode(65 + i)
    ),
    [meta.total, itemsPerGroup]
  );
  
  const currentGroupIndex = groupButtons.indexOf(currentGroup || 'A');
  const groupStartIndex = currentGroupIndex * itemsPerGroup;
  const groupEndIndex = Math.min((currentGroupIndex + 1) * itemsPerGroup, meta.total);
  const itemsInCurrentGroup = groupEndIndex - groupStartIndex;
  const pagesInCurrentGroup = Math.ceil(itemsInCurrentGroup / pageSize);

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

  const handleSlaughteredChange = useCallback((hewanId: string, checked: boolean, type: "sapi" | "domba") => {
    try {
      setIsUpdating(hewanId);
      const status = checked ? HewanStatus.DISEMBELIH : HewanStatus.TERDAFTAR
      updateHewan({
        hewanId,
        status,
        slaughtered: checked,
        tipeId: type === "sapi" ? 1 : 2,
      })
    } finally {
      setIsUpdating(null)
    }
  }, [updateHewan])

  // Calculate page range for current group
  const getPageRange = useCallback((pageIndex: number) => {
    const startInGroup = pageIndex * pageSize;
    const endInGroup = Math.min(startInGroup + pageSize, itemsInCurrentGroup);
    
    // Global numbering
    const globalStart =  startInGroup + 1;
    const globalEnd =  endInGroup;
    
    return `${globalStart} - ${globalEnd}`;
  }, [itemsInCurrentGroup, pageSize]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
          <TableSkeleton showHeader={false} columns={4} />
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
        
        <div className="space-y-4">
          {useGroups && totalGroups && totalGroups > 1 && (
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
            {Array.from({ length: pagesInCurrentGroup }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isLoading}
                >
                  {getPageRange(i)}
                </Button>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.map((hewan: HewanQurban) => (
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