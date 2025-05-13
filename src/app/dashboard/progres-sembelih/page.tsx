import { getHewanQurban, countHewanQurban } from "@/lib/db"
import ProgressSembelih from "./progress-sembelih-client"

export default async function ProgressSembelihPage() {
  const sapiData = await getHewanQurban("Sapi", 1, 10)
  const dombaData = await getHewanQurban("Domba", 1, 10)
  return (
    <div className="space-y-8">
      <ProgressSembelih
        initialSapiData={sapiData}
        initialDombaData={dombaData}
      />
    </div>
  )
}
