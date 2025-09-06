"use client"

import type { HewanQurban } from "#@/types/mudhohi.ts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"

interface QurbanStatusProps {
  data: HewanQurban
}

export function QurbanStatus({ data }: QurbanStatusProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "TERDAFTAR":
        return <Badge variant="outline">Terdaftar</Badge>
      case "TIBA":
        return <Badge variant="outline">Tiba di Lokasi</Badge>
      case "SEHAT":
        return <Badge variant="outline">Sehat</Badge>
      case "SAKIT":
        return <Badge variant="destructive">Sakit</Badge>
      case "DISEMBELIH":
        return <Badge variant="secondary">Disembelih</Badge>
      case "DICACAH":
        return <Badge variant="default">Dicacah</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    if (["DICACAH"].includes(status)) {
      return <CheckCircle2 className="h-8 w-8 text-green-500" />
    } else if (["TERDAFTAR", "TIBA", "SEHAT", "DISEMBELIH"].includes(status)) {
      return <Clock className="h-8 w-8 text-amber-500" />
    } else {
      return <AlertCircle className="h-8 w-8 text-red-500" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "TERDAFTAR":
        return "Hewan qurban Anda telah terdaftar dan sedang menunggu untuk dibawa ke lokasi penyembelihan."
      case "TIBA":
        return "Hewan qurban Anda telah tiba di lokasi penyembelihan dan sedang menunggu pemeriksaan kesehatan."
      case "SEHAT":
        return "Hewan qurban Anda telah diperiksa dan dinyatakan sehat. Siap untuk disembelih pada waktunya."
      case "SAKIT":
        return "Hewan qurban Anda dinyatakan sakit. Silakan hubungi panitia untuk informasi lebih lanjut."
      case "DISEMBELIH":
        return "Hewan qurban Anda telah disembelih dan sedang dalam proses pencacahan."
      case "DICACAH":
        return "Hewan qurban Anda telah selesai dicacah dan daging siap untuk dibagikan. Silakan ambil daging qurban sesuai jadwal dengan membawa kupon."
      default:
        return "Status hewan qurban Anda sedang diperbarui."
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-4">
        {getStatusIcon(data.status)}
        <div>
          <h3 className="font-medium">Status Qurban</h3>
          <div className="mt-1">{getStatusBadge(data.status)}</div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 text-sm">
          <p>{getStatusMessage(data.status)}</p>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-1">
          <div className="text-sm font-medium text-muted-foreground">Jenis Hewan</div>
          <div className="text-sm">{data.tipe?.nama}</div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="text-sm font-medium text-muted-foreground">ID Hewan</div>
          <div className="text-sm">{data.hewanId}</div>
        </div>
        {data.mudhohi && (
          <div className="grid grid-cols-2 gap-1">
            <div className="text-sm font-medium text-muted-foreground">Atas Nama</div>
            <div> {/* This div will hold either the ul or the single name */}
              {data.mudhohi.length > 1 ? (
                <ul>
                  {data.mudhohi.map((m) => (
                    <li key={m.id || m.nama_pengqurban}>{m.nama_pengqurban}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm">{data.mudhohi[0]?.nama_pengqurban}</div>
              )}
            </div>
          </div>
        )}
        {data.status === "DITIMBANG" && (
          <div className="grid grid-cols-2 gap-1">
            <div className="text-sm font-medium text-muted-foreground">Jumlah Paket</div>
            <div className="text-sm">{data.meatPackageCount} paket</div>
          </div>
        )}
      </div>
    </div>
  )
}
