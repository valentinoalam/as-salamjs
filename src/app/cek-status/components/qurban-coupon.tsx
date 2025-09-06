"use client"

import { useRef } from "react"
import { useReactToPrint } from "react-to-print"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Printer, Download } from "lucide-react"
import QRCode from "react-qr-code"
import type { HewanQurban } from "#@/types/mudhohi.ts"

interface QurbanCouponProps {
  data: HewanQurban
}

export function QurbanCoupon({ data }: QurbanCouponProps) {
  const couponRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: couponRef,
    documentTitle: `Kupon_Qurban_${data.hewanId}`,
  })

  const isReadyForPickup = data.status === "DIINVENTORI"

  return (
    <div className="space-y-4 py-2">
      {!isReadyForPickup ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
          <h3 className="font-medium mb-2">Daging Belum Siap Diambil</h3>
          <p className="text-sm">
            Hewan qurban Anda masih dalam proses {data.status.toLowerCase()}. Kupon pengambilan daging akan tersedia
            setelah proses pencacahan selesai.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            <h3 className="font-medium mb-2">Daging Siap Diambil</h3>
            <p className="text-sm">
              Silakan cetak kupon ini dan bawa saat pengambilan daging qurban. Pengambilan dapat dilakukan sesuai jadwal
              yang telah ditentukan.
            </p>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Cetak Kupon
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Simpan PDF
            </Button>
          </div>

          <div className="mt-6 border p-2 rounded-lg">
            <div ref={couponRef} className="p-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">KUPON PENGAMBILAN DAGING QURBAN</h2>
                <p className="text-sm text-muted-foreground">Tahun 1445 H / 2024 M</p>
              </div>

              <div className="flex justify-between items-center mb-4">
                {data.mudhohi && (
                  <div className="grid grid-cols-2 gap-1">
                    <div> {/* This div will hold either the ul or the single name */}
                      {data.mudhohi.length > 1 ? (
                        <ul>
                          {data.mudhohi.map((m) => (
                            <li key={m.id || m.nama_pengqurban}>{m.nama_pengqurban}</li>
                          ))}
                        </ul>
                      ) : (
                        <h3 className="text-sm">{data.mudhohi[0]?.nama_pengqurban}</h3>
                      )}
                      <p className="text-sm text-muted-foreground">Nomor ID: {data.hewanId}</p>
                    </div>
                    
                  </div>
                )}
                <div className="bg-white p-2 rounded-lg">
                  <QRCode
                    value={`SMQ-${data.id}-${data.hewanId}`}
                    size={80}
                    style={{ height: "auto", maxWidth: "100%", width: "80px" }}
                  />
                </div>
              </div>

              <Card className="mb-4">
                <div className="p-3 bg-muted rounded-t-lg">
                  <h4 className="font-medium">Detail Pengambilan</h4>
                </div>
                <div className="p-3 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium">Jenis Hewan:</div>
                    <div>{data.tipe?.nama}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium">Jumlah Paket:</div>
                    <div>{data.meatPackageCount} paket</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium">Lokasi Pengambilan:</div>
                    <div>Masjid Al-Ikhlas</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium">Tanggal Pengambilan:</div>
                    <div>17 Juni 2024</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium">Waktu Pengambilan:</div>
                    <div>10.00 - 15.00 WIB</div>
                  </div>
                </div>
              </Card>

              <div className="text-xs text-center text-muted-foreground">
                <p>Harap membawa kupon ini saat pengambilan daging qurban.</p>
                <p>Kupon ini tidak dapat dipindahtangankan tanpa sepengetahuan panitia.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
