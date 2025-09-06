import type { Role } from "@prisma/client"
import type { User } from "next-auth"

export interface AuthUser extends User {
  id: string
  name: string | null
  email: string | null
  roles: Role[]
  image?: string | null
}

export type UserWithRoles = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  roles: Role[]
  createdAt: Date
  updatedAt: Date
}

export type UsersResponse = {
  users: UserWithRoles[]
  total: number
}

export type CreateUserData = {
  name: string
  email: string
  password?: string
  urlAvatar?: string
  roles: Role[]
}

export type UpdateUserData = {
  roles: Role[]
}

export type UseUsersParams = {
  nameFilter?: string
  rolesFilter?: Role[]
  skip?: number
  take?: number
}
