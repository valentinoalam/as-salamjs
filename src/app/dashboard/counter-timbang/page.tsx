import { getProdukHewan } from "@/lib/db"
import { jenisProduk } from "@prisma/client"
import CounterTimbang from "./counter-timbang-client"

export default async function CounterTimbangPage() {
    const allProducts = await getProdukHewan()
    const produkDaging = allProducts.filter((p) => p.jenisProduk === "DAGING")


  return (
    <div className="space-y-8">
      <CounterTimbang initialProdukDaging={produkDaging} allProducts={allProducts} />
    </div>
  )
}
