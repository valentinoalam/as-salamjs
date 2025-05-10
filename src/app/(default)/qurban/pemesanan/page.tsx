import { getTipeHewan } from "./actions"
import PemesananForm from "./pemesanan-form"

export default async function PemesananPage() {
  const tipeHewan = await getTipeHewan()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Pemesanan Qurban</h1>
      <PemesananForm tipeHewan={tipeHewan} />
    </div>
  )
}
