"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Role } from "@prisma/client"
import { createUser, updateUserRole, deleteUser } from "./actions"

type User = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  urlAvatar: string | null
  role: Role
  createdAt: Date
  updatedAt: Date
}

interface UserManagementProps {
  initialUsers: User[]
}

export default function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    urlAvatar: "",
    role: Role.MEMBER,
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createUser(formData)

      if (result.success) {
        toast({
          title: "User Created",
          description: "The user has been created successfully.",
        })

        // Add the new user to the list
        setUsers((prev) => [...prev, result.user])

        // Reset form
        setFormData({
          name: "",
          email: "",
          password: "",
          urlAvatar: "",
          role: Role.MEMBER,
        })
      } else {
        throw new Error(result.error || "Failed to create user")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const result = await updateUserRole(userId, newRole)

      if (result.success) {
        toast({
          title: "Role Updated",
          description: "The user's role has been updated successfully.",
        })

        // Update the user in the list
        setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))
      } else {
        throw new Error(result.error || "Failed to update role")
      }
    } catch (error) {
      console.error("Error updating role:", error)
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      const result = await deleteUser(userId)

      if (result.success) {
        toast({
          title: "User Deleted",
          description: "The user has been deleted successfully.",
        })

        // Remove the user from the list
        setUsers((prev) => prev.filter((user) => user.id !== userId))
      } else {
        throw new Error(result.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "Admin"
      case Role.PETUGAS_PENDAFTARAN:
        return "Petugas Pendaftaran"
      case Role.PETUGAS_INVENTORY:
        return "Petugas Inventory"
      case Role.PETUGAS_PENYEMBELIHAN:
        return "Petugas Penyembelihan"
      case Role.MEMBER:
        return "Member"
      default:
        return role
    }
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

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
          <CardDescription>Create a new user and assign a role</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Leave blank to send invite email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urlAvatar">Avatar URL (optional)</Label>
                <Input
                  id="urlAvatar"
                  value={formData.urlAvatar}
                  onChange={(e) => handleChange("urlAvatar", e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                  <SelectItem value={Role.PETUGAS_PENDAFTARAN}>Petugas Pendaftaran</SelectItem>
                  <SelectItem value={Role.PETUGAS_INVENTORY}>Petugas Inventory</SelectItem>
                  <SelectItem value={Role.PETUGAS_PENYEMBELIHAN}>Petugas Penyembelihan</SelectItem>
                  <SelectItem value={Role.MEMBER}>Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>View and manage existing users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-md">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.urlAvatar || user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name || "Unnamed User"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue={user.role} onValueChange={(value) => handleRoleChange(user.id, value as Role)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                      <SelectItem value={Role.PETUGAS_PENDAFTARAN}>Petugas Pendaftaran</SelectItem>
                      <SelectItem value={Role.PETUGAS_INVENTORY}>Petugas Inventory</SelectItem>
                      <SelectItem value={Role.PETUGAS_PENYEMBELIHAN}>Petugas Penyembelihan</SelectItem>
                      <SelectItem value={Role.MEMBER}>Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center p-4 border rounded-md">
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
