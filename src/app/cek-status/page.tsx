import type { Metadata } from "next"
import Image from "next/image"
import { StatusChecker } from "./components/status-checker"

export const metadata: Metadata = {
  title: "Cek Status Qurban | Sistem Manajemen Qurban",
  description: "Cek status hewan qurban dan cetak ulang kupon pengambilan",
}

export default function CekStatusPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-green-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/placeholder.svg?height=80&width=80"
              alt="Logo SMQ"
              width={80}
              height={80}
              className="rounded-full bg-white p-2 shadow-xs"
            />
          </div>
          <h1 className="text-3xl font-bold text-green-800">Sistem Manajemen Qurban</h1>
          <p className="text-green-600 mt-2">Cek status hewan qurban dan cetak ulang kupon pengambilan</p>
        </header>

        <main>
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <StatusChecker />
            </div>
          </div>

          <div className="mt-12 max-w-2xl mx-auto bg-white rounded-xl shadow-xs p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Informasi Penting</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <span className="font-medium">Pengambilan Daging:</span> Pengambilan daging qurban dapat dilakukan
                dengan menunjukkan kupon yang telah diberikan atau dicetak dari sistem ini.
              </p>
              <p>
                <span className="font-medium">Waktu Pengambilan:</span> Pengambilan daging qurban dapat dilakukan pada
                hari pelaksanaan qurban mulai pukul 10.00 hingga 15.00.
              </p>
              <p>
                <span className="font-medium">Bantuan:</span> Jika Anda mengalami kesulitan dalam mengakses informasi
                qurban atau mencetak kupon, silakan hubungi panitia qurban di nomor 0812-3456-7890.
              </p>
            </div>
          </div>
        </main>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Sistem Manajemen Qurban. Hak Cipta Dilindungi.</p>
        </footer>
      </div>
    </div>
  )
}
