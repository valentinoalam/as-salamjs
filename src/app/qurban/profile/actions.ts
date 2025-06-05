"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"

export async function updateUserProfile(data: {
  userId: string
  urlAvatar?: string
  password?: string
}) {
  try {
    // Security check: Only allow users to update their own profile
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.id !== data.userId) {
      return { success: false, error: "You can only update your own profile" }
    }

    // Prepare update data
    const updateData: any = {}

    if (data.urlAvatar !== undefined) {
      updateData.urlAvatar = data.urlAvatar
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
