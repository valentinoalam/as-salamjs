"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import type { Role } from "@prisma/client"

export async function getAllUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export async function createUser(data: {
  name: string
  email: string
  password?: string
  urlAvatar?: string
  role: Role
}) {
  try {
    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Hash the password if provided
    let hashedPassword = undefined
    if (data.password) {
      hashedPassword = await hash(data.password, 10)
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        urlAvatar: data.urlAvatar || undefined,
        role: data.role,
      },
    })

    revalidatePath("/dashboard/panitia")
    return { success: true, user }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function updateUserRole(userId: string, role: Role) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    })

    revalidatePath("/dashboard/panitia")
    return { success: true }
  } catch (error) {
    console.error("Error updating user role:", error)
    return { success: false, error: "Failed to update user role" }
  }
}

export async function deleteUser(userId: string) {
  try {
    // Check if user has any associated mudhohi
    const mudhohiCount = await prisma.mudhohi.count({
      where: { userId },
    })

    if (mudhohiCount > 0) {
      return {
        success: false,
        error: "Cannot delete user with associated mudhohi records. Please reassign or delete those records first.",
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    revalidatePath("/dashboard/panitia")
    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: "Failed to delete user" }
  }
}
