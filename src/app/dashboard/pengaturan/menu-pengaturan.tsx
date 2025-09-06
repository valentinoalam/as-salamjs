'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TipeHewanSettings } from "./tipe-hewan-settings"
import { ProdukHewanSettings } from "./produk-hewan-settings"
import type { TipeHewan } from "@prisma/client"
import LandingPageSettings from "./landingpage-settings"
import LainnyaSettings from "./lainnya-settings"
import { useTabStore } from "#@/stores/ui-store.ts"
import type { ProdukHewan, TipeHewanWithImages } from "#@/types/qurban.ts"

interface MenuPengaturanProps {
  tipeHewan: TipeHewanWithImages[]
  produkHewan: ProdukHewan[]
}
export default function MenuPengaturan({tipeHewan, produkHewan}: MenuPengaturanProps) {
  const {tabs, setActiveTab} = useTabStore()

  return (
    <div className="w-full md:container mx-auto py-6">
      <Tabs defaultValue="tipe-hewan" value={tabs.pengaturan} onValueChange={(value) => setActiveTab("pengaturan", value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tipe-hewan">Tipe Hewan</TabsTrigger>
          <TabsTrigger value="produk-hewan" disabled={!tipeHewan}>Produk Hewan</TabsTrigger>
          <TabsTrigger value="landingpage">Landing Page</TabsTrigger>
          <TabsTrigger value="lainnya" >Lainnya</TabsTrigger>
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
        <TabsContent value="landingpage">
          <LandingPageSettings />
        </TabsContent>

        <TabsContent value="lainnya">
          <LainnyaSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
