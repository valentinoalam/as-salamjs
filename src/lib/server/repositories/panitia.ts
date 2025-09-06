/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import prisma from "#@/lib/server/prisma.ts"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import type { Role } from "@prisma/client"
import type { UserWithRoles } from "#@/types/user.ts"


export async function getAllUsers() {
  return await prisma.user.findMany({
    include: {
      roles: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getAllMember(
  nameFilter?: string,
  rolesFilter?: Role[],
  skip: number = 0,
  take: number = 10
): Promise<{ users: UserWithRoles[]; total: number }> {
  // Build the where condition dynamically
  const whereConditions: any = {};

  // Name filter (case-insensitive partial match)
  if (nameFilter) {
    whereConditions.name = {
      contains: nameFilter,
      mode: 'insensitive',
    };
  }

  // Role filter handling:
  if (rolesFilter === undefined) {
    // Default: Only MEMBER role
    whereConditions.roles = {
      some: { role: 'MEMBER' },
    };
  } else if (rolesFilter.length > 0) {
    // Specific roles filter
    whereConditions.roles = {
      some: { role: { in: rolesFilter } },
    };
  }
  // Else: rolesFilter is empty array = no role filter

  const [users, total] = await Promise.all([
    // Get paginated results
    prisma.user.findMany({
      where: whereConditions,
      include: { roles: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    // Get total matching records count
    prisma.user.count({ where: whereConditions }),
  ]);

  return { users, total };
}

export async function createUser(data: {
  name: string
  email: string
  password?: string
  urlAvatar?: string
  roles: Role[]
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

    // Create new user with roles
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        image: data.urlAvatar || undefined,
        roles: {
          create: data.roles.map((role) => ({ role })),
        },
      },
      include: {
        roles: true,
      },
    })

    revalidatePath("/dashboard/panitia")
    return { success: true, user }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function updateUserRoles(userId: string, roles: Role[]) {
  try {
    // Delete existing roles and create new ones
    await prisma.userRole.deleteMany({
      where: { userId },
    })

    await prisma.userRole.createMany({
      data: roles.map((role) => ({ userId, role })),
    })

    revalidatePath("/dashboard/panitia")
    return { success: true }
  } catch (error) {
    console.error("Error updating user roles:", error)
    return { success: false, error: "Failed to update user roles" }
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
