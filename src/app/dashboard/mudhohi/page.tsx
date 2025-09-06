import { getTipeHewan } from "#@/lib/server/repositories/mudhohi.ts"
import { getMudhohiStats, getMudhohiList } from "#@/lib/server/repositories/mudhohi.ts"
import MudhohiManagement from "./mudhohi-management"

export default async function MudhohiPage() {

  const stats = await getMudhohiStats()
  const initialMudhohi = await getMudhohiList()
  const tipeHewan = await getTipeHewan()
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Manajemen Pengqurban</h1>
      <MudhohiManagement initialStats={stats} initialMudhohi={initialMudhohi} tipeHewan={tipeHewan} />
    </div>
  )
}
