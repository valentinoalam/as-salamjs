"use server"

import prisma from "#@/lib/server/prisma.ts"
import { hash } from "bcryptjs"
import { Role } from "@prisma/client"
import { createVerificationToken, sendVerificationEmail } from "#@/lib/server/repositories/mudhohi.ts"

export async function registerUser(data: {
  name: string
  email: string
  password: string
}) {
  try {
    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Hash the password
    const hashedPassword = await hash(data.password, 10)

    // Create new user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: Role.MEMBER, // Default role for new users
      },
    })

    return { success: true, userId: user.id }
  } catch (error) {
    console.error("Error registering user:", error)
    return { success: false, error: "Failed to register user" }
  } finally {
    const { token } = await createVerificationToken(data.email)
    await sendVerificationEmail(data.email, token)
  }
}
