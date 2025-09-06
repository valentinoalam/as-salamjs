import { getCurrentUser } from "#@/lib/utils/auth.ts"
import { redirect } from "next/navigation"
import ProfileForm from "./profile-form"

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      <ProfileForm user={user} />
    </div>
  )
}
