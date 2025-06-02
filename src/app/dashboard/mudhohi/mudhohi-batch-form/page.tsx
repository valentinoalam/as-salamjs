import GoogleSheetsImport from "@/components/qurban/trx-admin/google-sheets-import";
import MudhohiSheet from "@/components/qurban/trx-admin/mudhohi-sheet";

export default function MudhohiBatchForm() {
  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sheet Data Mudhohi (Pengqurban)</h1>
        <GoogleSheetsImport />
      </div>
      <div className="w-full">
        <MudhohiSheet />
      </div>
    </main>
  )
}
