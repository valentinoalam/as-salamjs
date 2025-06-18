import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TipeHewanSettings } from "./tipe-hewan-settings"
import { ProdukHewanSettings } from "./produk-hewan-settings"
import { getAllProdukHewan } from "./actions"
import { getAllTipeHewan } from "@/services/qurban"
import type { TipeHewan } from "@prisma/client"

export const metadata = {
  title: "Pengaturan - Qurban Management System",
  description: "Pengaturan sistem manajemen qurban",
}

export default async function PengaturanPage() {
  const [tipeHewan, produkHewan] = await Promise.all([getAllTipeHewan(), getAllProdukHewan()])

  return (
    <div className="w-full md:container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Pengaturan Sistem</h1>

      <Tabs defaultValue="tipe-hewan">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tipe-hewan">Tipe Hewan</TabsTrigger>
          <TabsTrigger value="produk-hewan" disabled={!tipeHewan}>Produk Hewan</TabsTrigger>
        </TabsList>
        <TabsContent value="tipe-hewan">
          <div className="mt-6">
            <TipeHewanSettings initialTipeHewan={tipeHewan} />
          </div>
        </TabsContent>
        <TabsContent value="produk-hewan">
          <div className="mt-6">
            <ProdukHewanSettings initialProdukHewan={produkHewan} tipeHewan={tipeHewan as TipeHewan[]} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
