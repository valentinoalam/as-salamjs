import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HewanProcessingTable } from "./components/hewan-processing-table"
import { BulkUpdateStatus } from "./components/bulk-update"
// import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "#@/lib/server/prisma.ts"
import { HewanStatus } from "@prisma/client"
import { QrCodeIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ProsesPage() {
  // const session = await auth()

  // // Check if user is authenticated and has required role
  // if (!session || !["ADMIN", "PANITIA_LAPANGAN"].includes(session.user.role)) {
  //   redirect("/login")
  // }

  // Fetch animals with relevant statuses
  const hewanSiapSembelih = await prisma.hewanQurban.findMany({
    where: {
      status: {
        in: [HewanStatus.TIBA, HewanStatus.SEHAT],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const hewanSudahDisembelih = await prisma.hewanQurban.findMany({
    where: {
      status: HewanStatus.DISEMBELIH,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  const hewanSudahDicacah = await prisma.hewanQurban.findMany({
    where: {
      status: HewanStatus.DICACAH,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Proses Penyembelihan & Pencacahan</h1>
          <p className="text-muted-foreground mt-2">
            Kelola status hewan qurban selama proses penyembelihan dan pencacahan
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/scan">
            <QrCodeIcon className="mr-2 h-4 w-4" />
            Scan QR Code
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <BulkUpdateStatus />
      </div>

      <Tabs defaultValue="siap-sembelih" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="siap-sembelih">Siap Sembelih ({hewanSiapSembelih.length})</TabsTrigger>
          <TabsTrigger value="sudah-disembelih">Sudah Disembelih ({hewanSudahDisembelih.length})</TabsTrigger>
          <TabsTrigger value="sudah-dicacah">Sudah Dicacah ({hewanSudahDicacah.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="siap-sembelih">
          <HewanProcessingTable data={hewanSiapSembelih} />
        </TabsContent>

        <TabsContent value="sudah-disembelih">
          <HewanProcessingTable data={hewanSudahDisembelih} />
        </TabsContent>

        <TabsContent value="sudah-dicacah">
          <HewanProcessingTable data={hewanSudahDicacah} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
