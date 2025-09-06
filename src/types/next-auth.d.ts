import type { Role } from "@prisma/client"
import "next-auth"
declare module "next-auth" {
  interface User {
    roles?: Role[]
  }

  interface Session {
    user?: {
      id: string
      name: string | null
      email: string | null
      image?: string | null
      roles: Role[]
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    roles?: Role[]
  }
}