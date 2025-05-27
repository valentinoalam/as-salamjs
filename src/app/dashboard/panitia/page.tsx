import { getAllUsers } from "@/services/panitia"
import UserManagement from "./user-management"

export default async function PanitiaPage() {
  const users = await getAllUsers()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Manajemen Panitia</h1>
      <UserManagement initialUsers={users} />
    </div>
  )
}
