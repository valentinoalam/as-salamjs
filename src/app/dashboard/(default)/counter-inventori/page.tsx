"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Counter } from "@prisma/client"


import DistributionContentTab from "./distribution-tab"
import PenerimaanContentTab from "./penerimaan-tab"
import KuponContentTab from "./kupon-tab"
import { Button } from "@/components/ui/button"
import { useProduct } from "#@/hooks/qurban/use-produk.tsx"

export default function CounterInventoriPage() {
  const {
    isConnected,
    getProductLogsByPlace,
    getProductById,
  } = useProduct()
  // State variables
  const [showProductHistory, setShowProductHistory] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<number | null>(null)
 
  // Memoized product logs
  const productLogs = useMemo(() => 
    getProductLogsByPlace(Counter.INVENTORY),
  [getProductLogsByPlace]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleShowProductHistory = (produkId: number) => {
    setSelectedProductForHistory(produkId)
    setShowProductHistory(true)
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Tabs defaultValue="pengiriman">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
          <TabsTrigger value="distribusi">Distribusi</TabsTrigger>
          <TabsTrigger value="kupon">Kupon</TabsTrigger>
        </TabsList>

        <TabsContent value="pengiriman">
          <PenerimaanContentTab />
        </TabsContent>

        <TabsContent value="distribusi">
          <DistributionContentTab />
        </TabsContent>

        <TabsContent value="kupon">
          <KuponContentTab />
        </TabsContent>
      </Tabs>
      
      {/* Product History Dialog */}
      <Dialog open={showProductHistory} onOpenChange={setShowProductHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Produk Histori - {getProductById(selectedProductForHistory!)?.nama}
            </DialogTitle>
            <DialogDescription>Log riwayat produk ini</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 my-4">
            {productLogs
              .filter(log => log.produkId === selectedProductForHistory)
              .map(log => (
                <div key={log.id} className="border rounded-md p-3">
                  <div className="flex justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      log.event === "menambahkan" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {log.event === "menambahkan" ? "Added" : "Removed"}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium">Jumlah:</span> {log.value}
                  </div>
                  {log.note && (
                    <div className="mt-1">
                      <span className="font-medium">Catatan:</span> {log.note}
                    </div>
                  )}
                </div>
              ))}

            {!productLogs.some(log => log.produkId === selectedProductForHistory) && (
              <div className="text-center p-4">Belum ada riwayat</div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowProductHistory(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}