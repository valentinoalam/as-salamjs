import { getHewanQurban, countHewanQurban } from "@/lib/db"
import ProgressSembelih from "./progress-sembelih-client"

export default async function ProgressSembelihPage() {
  const sapiData = await getHewanQurban("sapi", 1, 10)
  const kambingData = await getHewanQurban("kambing", 1, 10)

  const totalSapi = await countHewanQurban("sapi")
  const totalKambing = await countHewanQurban("kambing")

  const sapiPages = Math.ceil(totalSapi / 10)
  const kambingPages = Math.ceil(totalKambing / 10)

  // Calculate kambing groups (A-G for every 50 kambing)
  const kambingGroups = []
  for (let i = 0; i < Math.ceil(totalKambing / 50); i++) {
    kambingGroups.push(String.fromCharCode(65 + i)) // A, B, C, etc.
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Progres Sembelih</h1>

      <ProgressSembelih
        initialSapiData={sapiData}
        initialKambingData={kambingData}
        sapiPages={sapiPages}
        kambingPages={kambingPages}
        kambingGroups={kambingGroups}
      />
    </div>
  )
}
