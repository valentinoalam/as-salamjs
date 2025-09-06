import UserManagement from "./user-management"

export default async function PanitiaPage() {

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Manajemen Panitia</h1>
      <UserManagement/>
    </div>
  )
}
