import { getTransactionStats, getTransactions } from "./actions"
import KeuanganManagement from "./keuangan-management"

export default async function KeuanganPage() {

  const stats = await getTransactionStats()
  const initialTransactions = await getTransactions()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Manajemen Keuangan</h1>
      <KeuanganManagement initialStats={stats} initialTransactions={initialTransactions} />
    </div>
  )
}
