import type { Metadata } from "next"
import { QRScanner } from "./components/qr-scanner"
// import { auth } from "@/auth"
// import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Scan QR Code | Sistem Manajemen Qurban",
  description: "Scan QR code untuk mengupdate status hewan qurban",
}

export default async function ScanPage() {
  // const session = await auth()

  // // Check if user is authenticated and has required role
  // if (!session || !["ADMIN", "PANITIA_LAPANGAN"].includes(session.user.role)) {
  //   redirect("/login")
  // }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Scan QR Code</h1>
        <p className="text-muted-foreground mt-2">Scan QR code untuk mengupdate status hewan qurban</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-xs">
            <div className="p-6">
              <h3 className="text-lg font-medium">Petunjuk Penggunaan</h3>
              <div className="mt-4 space-y-4 text-sm">
                <p>1. Arahkan kamera ke QR code yang terpasang pada hewan qurban.</p>
                <p>2. Sistem akan secara otomatis mendeteksi QR code dan mengupdate status hewan.</p>
                <p>3. Status hewan akan diperbarui ke tahap berikutnya sesuai urutan:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>TERDAFTAR → TIBA</li>
                  <li>TIBA → SEHAT</li>
                  <li>SEHAT → DISEMBELIH</li>
                  <li>DISEMBELIH → DICACAH</li>
                </ul>
                <p>4. Pastikan Anda memiliki izin yang sesuai untuk mengupdate status hewan.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <QRScanner />
        </div>
      </div>
    </div>
  )
}
