import type { Role } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface User {
    role?: Role
  }

  // interface Session {
  //   user?: {
  //     id?: string
  //     name?: string | null
  //     email?: string | null
  //     image?: string | null
  //     role: Role
  //   }
  // }
  interface Session {
    user: DefaultSession["user"] & {
      role: Role
    }
  }

  interface AdapterUser extends User {
    id: string
    email: string
    emailVerified: Date | null
    role: string // Add your custom role field
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: Role
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: string // Also declare for core adapters
  }
}