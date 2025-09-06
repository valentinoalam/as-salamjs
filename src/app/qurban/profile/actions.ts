"use server"

import prisma from "#@/lib/server/prisma.ts"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "#@/lib/utils/auth.ts"
import type { User } from "@prisma/client"

export async function updateUserProfile(data: {
  userId: string
  image?: string
  password?: string
}) {
  try {
    // Security check: Only allow users to update their own profile
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.id !== data.userId) {
      return { success: false, error: "You can only update your own profile" }
    }

    // Prepare update data
    const updateData: User = {} as User

    if (data.image !== undefined) {
      updateData.image = data.image
    }

    if (data.password) {
      // In a real app, you would hash the password here
      updateData.password = data.password
    }

    // Update user
    await prisma.user.update({
      where: { id: data.userId },
      data: updateData,
    })

    revalidatePath("/profile")
    return { success: true }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return { success: false, error: "Failed to update profile" }
  }
}
