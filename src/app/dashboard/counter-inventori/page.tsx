import { getProdukHewan, getDistribution, getMudhohi, getPenerima, getErrorLogs } from "@/lib/db"
import CounterInventori, { type ErrorLog } from "./counter-inventori-client"

export default async function CounterInventoriPage() {
  const products = await getProdukHewan()
  const distributions = await getDistribution()
  const mudhohi = await getMudhohi(1, 10)
  const penerima = await getPenerima()
  const errorLogs: ErrorLog[] = await getErrorLogs()

  return (
    <div className="space-y-8">
      <CounterInventori
        initialProducts={products}
        distributions={distributions}
        initialMudhohi={mudhohi}
        initialPenerima={penerima}
        initialErrLogs={errorLogs}
      />
    </div>
  )
}
