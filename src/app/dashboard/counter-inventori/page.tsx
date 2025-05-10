import { getProdukHewan, getDistribution, getMudhohi, getPenerima } from "@/lib/db"
import CounterInventori from "./counter-inventori-client"

export default async function CounterInventoriPage() {
  const products = await getProdukHewan()
  const distributions = await getDistribution()
  const mudhohi = await getMudhohi(1, 10)
  const penerima = await getPenerima()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Counter Inventori</h1>

      <CounterInventori
        initialProducts={products}
        distributions={distributions}
        initialMudhohi={mudhohi}
        initialPenerima={penerima}
      />
    </div>
  )
}
