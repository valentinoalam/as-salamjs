"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Role } from "@prisma/client"
import { Badge } from "#@/components/ui/badge.tsx"
import { Plus, Trash2, Users, UserCheck, ChevronLeft, ChevronRight, Edit, UserMinus, UserPlus } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useUsers, useUpdateUser, useDeleteUser } from "@/hooks/use-users"
import { UserFormModal } from "./user-form-modal"
import type { UserWithRoles } from "#@/types/user.ts"


const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  PETUGAS_PENDAFTARAN: "Petugas Pendaftaran",
  PETUGAS_INVENTORY: "Petugas Inventory",
  PETUGAS_TIMBANG: "Petugas Penyembelihan",
  USER: "User",
  MEMBER: "Member",
  PETUGAS_KEUANGAN: "Petugas Keuangan",
}

const roleColors: Record<Role, string> = {
  ADMIN: "bg-red-100 text-red-800",
  PETUGAS_PENDAFTARAN: "bg-blue-100 text-blue-800",
  PETUGAS_INVENTORY: "bg-orange-100 text-orange-800",
  PETUGAS_TIMBANG: "bg-yellow-100 text-yellow-800",
  USER: "bg-gray-100 text-gray-800",
  MEMBER: "bg-purple-100 text-purple-800",
  PETUGAS_KEUANGAN: "bg-green-100 text-green-800",
}

export default function UserManagement() {
  const [showMembersOnly, setShowMembersOnly] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)

  const itemsPerPage = 6
  const rolesFilter = showMembersOnly ? ["MEMBER"] as Role[] : undefined

  const {
    data: usersData,
    isLoading,
    error,
  } = useUsers({
    nameFilter: searchTerm || undefined,
    rolesFilter,
    skip: (currentPage - 1) * itemsPerPage,
    take: itemsPerPage,
  })

  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  const totalPages = usersData ? Math.ceil(usersData.total / itemsPerPage) : 0

  // Reset to first page when switching filters or searching
  const handleFilterChange = (membersOnly: boolean) => {
    setShowMembersOnly(membersOnly)
    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleCreateUser = () => {
    setSelectedUser(null)
    setModalMode("create")
    setModalOpen(true)
  }

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user)
    setModalMode("edit")
    setModalOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }
    await deleteUserMutation.mutateAsync(userId)

  }

  const toggleUserMemberRole = async (user: UserWithRoles) => {
    const currentRoles = user.roles.map((r) => r.role)
    const hasUser = currentRoles.includes("USER")
    const hasMember = currentRoles.includes("MEMBER")

    let newRoles: Role[]

    if (hasUser && hasMember) {
      // Has both, remove USER (keep MEMBER + other roles)
      newRoles = currentRoles.filter((role) => role !== "USER")
    } else if (hasMember && !hasUser) {
      // Has MEMBER only, add USER
      newRoles = [...currentRoles, "USER"]
    } else if (hasUser && !hasMember) {
      // Has USER only, add MEMBER
      newRoles = [...currentRoles, "MEMBER"]
    } else {
      // Has neither, add MEMBER (default)
      newRoles = [...currentRoles, "MEMBER"]
    }

    await updateUserMutation.mutateAsync({
      id: user.id,
      data: { roles: newRoles },
    })
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getUserAccessType = (user: UserWithRoles) => {
    const hasUserRole = user.roles.some((r) => r.role === "USER")
    const hasMemberRole = user.roles.some((r) => r.role === "MEMBER")

    if (hasUserRole && hasMemberRole) return "Both"
    if (hasMemberRole) return "Member Dashboard"
    if (hasUserRole) return "User Dashboard"
    return "No Dashboard Access"
  }

  const getDashboardToggleButton = (user: UserWithRoles) => {
    const hasUser = user.roles.some((r) => r.role === "USER")
    const hasMember = user.roles.some((r) => r.role === "MEMBER")

    if (hasUser && hasMember) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleUserMemberRole(user)}
          className="gap-1 flex-1"
          disabled={updateUserMutation.isPending}
        >
          <UserMinus className="w-4 h-4" />
          Remove User Access
        </Button>
      )
    } else if (hasMember) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleUserMemberRole(user)}
          className="gap-1 flex-1"
          disabled={updateUserMutation.isPending}
        >
          <UserPlus className="w-4 h-4" />
          Add User Access
        </Button>
      )
    } else {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleUserMemberRole(user)}
          className="gap-1 flex-1"
          disabled={updateUserMutation.isPending}
        >
          <UserPlus className="w-4 h-4" />
          Make Member
        </Button>
      )
    }
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading users: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Manage Users</span>
            <div className="flex items-center gap-4">
              <Button onClick={handleCreateUser} className="gap-1">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <Label htmlFor="filter-switch" className="text-sm">
                  All Users
                </Label>
                <Switch id="filter-switch" checked={showMembersOnly} onCheckedChange={handleFilterChange} />
                <UserCheck className="w-4 h-4" />
                <Label htmlFor="filter-switch" className="text-sm">
                  Members Only
                </Label>
              </div>
            </div>
          </CardTitle>
          <CardDescription>
            {usersData
              ? `Showing ${usersData.users.length} of ${usersData.total} ${showMembersOnly ? "members" : "users"}`
              : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search users by name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Users List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center p-4">Loading users...</div>
              ) : usersData?.users.length === 0 ? (
                <div className="text-center p-4 border rounded-md">
                  <p className="text-muted-foreground">
                    {searchTerm ? "No users match your search" : "No users found"}
                  </p>
                </div>
              ) : (
                usersData?.users.map((user) => {
                  const isMember = user.roles.some((r) => r.role === "MEMBER")

                  return (
                    <div
                      key={user.id}
                      className="flex flex-col md:flex-row items-start justify-between p-4 border rounded-md gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar>
                          <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium">{user.name || "Unnamed User"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map(({ role }) => (
                              <Badge key={role} className={roleColors[role]}>
                                {roleLabels[role]}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Dashboard Access: {getUserAccessType(user)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full md:w-96">
                        {/* Only show role management for members */}
                        {isMember && (
                          <Button variant="outline" size="sm" onClick={() => handleEditUser(user)} className="gap-1">
                            <Edit className="w-4 h-4" />
                            Edit Roles
                          </Button>
                        )}

                        {!isMember && (
                          <div className="text-sm text-muted-foreground p-2 bg-gray-50 rounded">
                            Only members can be assigned additional roles
                          </div>
                        )}

                        <div className="flex gap-2">
                          {getDashboardToggleButton(user)}

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="gap-1"
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <UserFormModal open={modalOpen} onOpenChange={setModalOpen} user={selectedUser} mode={modalMode} />
    </div>
  )
}
