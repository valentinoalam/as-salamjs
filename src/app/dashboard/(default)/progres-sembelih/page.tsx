'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProgressHewan from "@/components/qurban/progress-hewan"
import { useQurban } from "@/hooks/qurban/use-qurban"
import { usePaginationStore, useTabStore } from "#@/stores/ui-store.ts";

export default function ProgressSembelihPage() {
  const { meta, isConnected, sapiQuery, dombaQuery } = useQurban();
  const { pagination, setPagination } = usePaginationStore()
  const { tabs, setActiveTab } = useTabStore()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Tabs defaultValue="sapi"
        value={tabs.progressSembelih}
        onValueChange={(value) => setActiveTab("progressSembelih", value)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sapi">Sapi</TabsTrigger>
          <TabsTrigger value="domba">Domba</TabsTrigger>
        </TabsList>

        <TabsContent value="sapi">
          <ProgressHewan 
            tipeHewan="sapi"
            meta={meta.sapi} 
            queryHewan={sapiQuery}
            currentPage={pagination.sapiPage} // You might want to pass specific pagination state
            setPage={setPagination} // Or a specific setter
          />
        </TabsContent>

        <TabsContent value="domba">
          <ProgressHewan 
            tipeHewan="domba" 
            meta={meta.domba}
            queryHewan={dombaQuery}
            currentPage={pagination.dombaPage} // You might want to pass specific pagination state
            currentGroup={pagination.dombaGroup!}
            setPage={setPagination} // Or a specific setter
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
