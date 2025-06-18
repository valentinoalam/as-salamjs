"use client"

import { useState } from "react"
import { useQurban } from "@/contexts/qurban-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown, ChevronUp, Clock, CheckCircle, TruckIcon } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PengirimanStatus } from "@prisma/client"

export function ShipmentHistory() {
  const { shipmentsQuery } = useQurban()
  const [expandedShipments, setExpandedShipments] = useState<Set<number>>(new Set())

  const toggleShipment = (id: number) => {
    const newExpanded = new Set(expandedShipments)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedShipments(newExpanded)
  }

  if (shipmentsQuery.isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading shipment history...</span>
      </div>
    )
  }

  if (shipmentsQuery.isError) {
    return (
      <div className="flex justify-center items-center py-12 text-red-500">
        <p>Error loading shipment history. Please try again.</p>
      </div>
    )
  }

  if (shipmentsQuery.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengiriman</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <TruckIcon className="mx-auto h-12 w-12 opacity-30 mb-2" />
            <p>Belum ada riwayat pengiriman</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Pengiriman</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shipmentsQuery.data.map((shipment) => (
            <Collapsible
              key={shipment.id}
              open={expandedShipments.has(shipment.id)}
              onOpenChange={() => toggleShipment(shipment.id)}
              className="border rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 p-4 flex items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="font-medium">Pengiriman #{shipment.id}</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(shipment.waktuPengiriman), "dd MMM yyyy, HH:mm", { locale: id })}
                  </div>
                  <Badge
                    variant={shipment.statusPengiriman === PengirimanStatus.DITERIMA ? "default" : "destructive"}
                    className="w-fit"
                  >
                    {shipment.statusPengiriman === PengirimanStatus.DITERIMA ? "Diterima" : "Dikirim"}
                  </Badge>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {expandedShipments.has(shipment.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="p-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Daftar Produk:</h4>
                  <div className="space-y-2">
                    {shipment.daftarProdukHewan.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span>
                          {typeof item.produk === "object" && "nama" in item.produk
                            ? item.produk.nama
                            : `Produk #${item.produkId}`}
                        </span>
                        <span className="font-medium">{item.jumlah} unit</span>
                      </div>
                    ))}
                  </div>

                  {shipment.catatan && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-1">Catatan:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{shipment.catatan}</p>
                    </div>
                  )}

                  {shipment.statusPengiriman === PengirimanStatus.DITERIMA && shipment.waktuDiterima && (
                    <div className="mt-4 flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        Diterima pada {format(new Date(shipment.waktuDiterima), "dd MMM yyyy, HH:mm", { locale: id })}
                      </span>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
