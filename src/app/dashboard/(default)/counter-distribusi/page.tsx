import { getCouponData, getProdukHewan } from "@/lib/server/repositories/qurban"
import CounterDistribusi from "./counter-distribusi-client"

export default async function CounterDistribusiPage() {
  const kupon = await getCouponData()
  const products = await getProdukHewan("DAGING")

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Counter Distribusi Kupon</h1>

      <CounterDistribusi initialCoupons={kupon} meatProducts={products} />
    </div>
  )
}
