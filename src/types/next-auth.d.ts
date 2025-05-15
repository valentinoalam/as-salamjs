import type { Role } from "@prisma/client"
import "next-auth"
declare module "next-auth" {
  interface User {
    role?: Role
  }

  interface Session {
    user?: {
      id: string
      name: string | null
      email: string | null
      urlAvatar?: string | null
      role: Role
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: Role
  }
}