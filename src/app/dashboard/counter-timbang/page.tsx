import { getProdukHewan } from "@/lib/db"
import { jenisProduk } from "@prisma/client"
import CounterTimbang from "./counter-timbang-client"

export default async function CounterTimbangPage() {
  const produkDaging = await getProdukHewan(jenisProduk.DAGING)
  const allProducts = await getProdukHewan()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Counter Timbang</h1>

      <CounterTimbang initialProdukDaging={produkDaging} allProducts={allProducts} />
    </div>
  )
}
