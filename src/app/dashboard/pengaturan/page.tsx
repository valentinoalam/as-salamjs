import { getAllProdukHewan } from "./actions"
import { getAllTipeHewan } from "#@/lib/server/repositories/qurban.ts"
import MenuPengaturan from "./menu-pengaturan"

export const metadata = {
  title: "Pengaturan - Qurban Management System",
  description: "Pengaturan sistem manajemen qurban",
}

export default async function PengaturanPage() {
  const [tipeHewan, produkHewan] = await Promise.all([getAllTipeHewan(), getAllProdukHewan()])

  return (
    <div className="w-full md:container mx-auto py-6">
      <MenuPengaturan tipeHewan={tipeHewan} produkHewan={produkHewan} />
    </div>
  )
}
