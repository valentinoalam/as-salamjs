import type { UseUsersParams, UsersResponse, CreateUserData, UpdateUserData } from "#@/types/user.ts"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "./use-toast"

export function useUsers(params: UseUsersParams = {}) {
  const { nameFilter, rolesFilter, skip = 0, take = 10 } = params

  return useQuery<UsersResponse>({
    queryKey: ["users", { nameFilter, rolesFilter, skip, take }],
    queryFn: async () => {
      const searchParams = new URLSearchParams()

      if (nameFilter) searchParams.set("name", nameFilter)
      if (rolesFilter && rolesFilter.length > 0) {
        searchParams.set("roles", rolesFilter.join(","))
      }
      searchParams.set("skip", skip.toString())
      searchParams.set("take", take.toString())

      const response = await fetch(`/api/users?${searchParams}`)
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      return response.json()
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create user")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({
        title: "User Created",
        description: "The user has been created successfully.",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:  error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      })
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update user")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({
        title: "Roles Updated",
        description: "User dashboard access has been updated.",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user roles",
        variant: "destructive",
      })
    }
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete user")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({
        title: "User Deleted",
        description: "The user has been deleted successfully.",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      })
    }
  })
}
