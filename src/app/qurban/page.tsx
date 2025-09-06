import { getAllTipeHewan } from "#@/lib/server/repositories/qurban.ts"
import { QurbanLanding } from "@/components/qurban/landing"

export default async function QurbanHome() {
  const tipeHewan = await getAllTipeHewan()
  return <QurbanLanding tipeHewan={tipeHewan} />
}
