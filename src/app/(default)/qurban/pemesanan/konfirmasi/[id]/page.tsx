import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getMudhohiById } from "./actions"

export default async function KonfirmasiPage({ params }: { params: { id: string } }) {
  const mudhohi = await getMudhohiById(params.id)

  if (!mudhohi) {
    notFound()
  }

  const tipeHewan = mudhohi.hewan[0]?.tipe
  const isKolektif = mudhohi.hewan[0]?.isKolektif

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Konfirmasi Pemesanan</h1>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Terima Kasih, {mudhohi.nama_pengqurban}</CardTitle>
          <CardDescription>Pemesanan qurban Anda telah berhasil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-primary/10 rounded-md">
            <h3 className="font-medium text-lg mb-2">Detail Pemesanan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kode Pemesanan</p>
                <p className="font-medium">{mudhohi.dash_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Pemesanan</p>
                <p className="font-medium">{new Date(mudhohi.createdAt).toLocaleDateString("id-ID")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jenis Hewan</p>
                <p className="font-medium">
                  {tipeHewan?.icon} {tipeHewan?.nama} {isKolektif && "(Patungan)"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status Pembayaran</p>
                <p className="font-medium">
                  {mudhohi.payment?.paymentStatus === "LUNAS" ? (
                    <span className="text-green-600">Lunas</span>
                  ) : mudhohi.payment?.paymentStatus === "MENUNGGU_KONFIRMASI" ? (
                    <span className="text-yellow-600">Menunggu Konfirmasi</span>
                  ) : (
                    <span className="text-red-600">Belum Bayar</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg">Informasi Pembayaran</h3>
            <div className="p-4 border rounded-md">
              <p className="font-medium mb-2">Total Pembayaran</p>
              <p className="text-2xl font-bold">Rp {tipeHewan?.harga.toLocaleString("id-ID")}</p>
              <div className="mt-4">
                <p className="font-medium mb-2">Metode Pembayaran</p>
                <p>{mudhohi.payment?.cara_bayar === "TRANSFER" ? "Transfer Bank" : "Tunai di Sekretariat Panitia"}</p>
                {mudhohi.payment?.cara_bayar === "TRANSFER" && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Silahkan transfer ke:</p>
                    <p>Bank Syariah Indonesia (BSI)</p>
                    <p>7190671254</p>
                    <p>a.n. Panitia Qurban</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg">Informasi Pengambilan</h3>
            <div className="p-4 border rounded-md">
              {mudhohi.mengambilDaging ? (
                <div>
                  <p>Anda telah memilih untuk mengambil daging qurban.</p>
                  <p className="mt-2">
                    Pengambilan daging dapat dilakukan pada tanggal 17 Juni 2023 pukul 10.00 - 15.00 WIB di lokasi
                    penyembelihan.
                  </p>
                </div>
              ) : (
                <p>Anda telah memilih untuk tidak mengambil daging qurban.</p>
              )}
            </div>
          </div>

          {mudhohi.potong_sendiri && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Informasi Penyembelihan</h3>
              <div className="p-4 border rounded-md">
                <p>Anda telah memilih untuk menyaksikan penyembelihan.</p>
                <p className="mt-2">
                  Penyembelihan akan dilakukan pada tanggal 17 Juni 2023 mulai pukul 07.00 WIB di lokasi penyembelihan.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button asChild variant="outline">
            <Link href="/pemesanan">Pesan Lagi</Link>
          </Button>
          <Button asChild>
            <Link href="/">Kembali ke Beranda</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
