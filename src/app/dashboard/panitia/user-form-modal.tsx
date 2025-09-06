/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Info, Shield, Users, Package, Scale, CreditCard, UserCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Role } from "@prisma/client"
import { useCreateUser, useUpdateUser } from "@/hooks/use-users"
import IncludeExcludeList, { type ListItem, type ValidationRule } from "@/components/ui/include-exclude-list";
type UserWithRoles = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  roles: { role: Role }[]
  createdAt: Date
  updatedAt: Date
}

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  PETUGAS_PENDAFTARAN: "Petugas Pendaftaran",
  PETUGAS_INVENTORY: "Petugas Inventory",
  PETUGAS_TIMBANG: "Petugas Penyembelihan",
  USER: "User",
  MEMBER: "Member",
  PETUGAS_KEUANGAN: "Petugas Keuangan",
}

const roleDescriptions: Record<Role, string> = {
  ADMIN: "Full system access with all permissions",
  PETUGAS_PENDAFTARAN: "Manages user registration and new entries",
  PETUGAS_INVENTORY: "Handles stock management and item tracking",
  PETUGAS_TIMBANG: "Responsible for weighing and slaughtering processes",
  USER: "Basic user with limited permissions",
  MEMBER: "Registered member with specific benefits - Required for all users",
  PETUGAS_KEUANGAN: "Manages financial transactions and reporting",
}

const roleIcons: Record<Role, React.ReactNode> = {
  ADMIN: <Shield className="h-4 w-4" />,
  PETUGAS_PENDAFTARAN: <UserCheck className="h-4 w-4" />,
  PETUGAS_INVENTORY: <Package className="h-4 w-4" />,
  PETUGAS_TIMBANG: <Scale className="h-4 w-4" />,
  USER: <Users className="h-4 w-4" />,
  MEMBER: <Users className="h-4 w-4" />,
  PETUGAS_KEUANGAN: <CreditCard className="h-4 w-4" />,
}

const roleCategories = {
  core: ["MEMBER", "USER"] as Role[],
  administrative: ["ADMIN"] as Role[],
  operational: ["PETUGAS_PENDAFTARAN", "PETUGAS_INVENTORY", "PETUGAS_TIMBANG", "PETUGAS_KEUANGAN"] as Role[],
}
const allRoleItems: Record<string, ListItem> = Object.values(Role).reduce((acc, role) => {
  // Exclude 'USER' from being added to the list of selectable items
  if (role === "USER") {
    return acc;
  }

  acc[role] = {
    key: role,
    label: roleLabels[role],
    tooltip: roleDescriptions[role],
    value: role,
    category: Object.entries(roleCategories).find(([, roles]) => roles.includes(role))?.[0],
    removable: role !== "MEMBER",
    metadata: {
      icon: roleIcons[role],
      isSuperceding: role === "ADMIN"
    }
  };
  return acc;
}, {} as Record<string, ListItem>);

const roleValidation: ValidationRule[] = [
  { type: 'required', message: 'At least one role must be selected' },
  {
    type: 'custom',
    message: 'Member role is required for all users',
    validator: (selectedItems: string[]) => selectedItems.includes('MEMBER'),
  },
  {
    type: 'custom',
    message: 'Admin role supersedes other operational roles. Please deselect others if Admin is chosen.',
    validator: (selectedItems: string[]) => {
      if (selectedItems.includes('ADMIN')) {
        // If ADMIN is selected, ensure only ADMIN and MEMBER are selected
        return selectedItems.every(role => role === 'ADMIN' || role === 'MEMBER');
      }
      return true;
    },
  },
];
interface UserFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserWithRoles | null
  mode: "create" | "edit"
}

interface FormData {
  name: string
  email: string
  password: string
  urlAvatar: string
  roles: Role[]
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  roles?: string
}

export function UserFormModal({ open, onOpenChange, user, mode }: UserFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    urlAvatar: "",
    roles: ["MEMBER"],
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()

  useEffect(() => {
    if (mode === "edit" && user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        urlAvatar: user.image || "",
        roles: user.roles.map((r) => r.role),
      })
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        urlAvatar: "",
        roles: ["MEMBER"],
      })
    }
    setErrors({})
  }, [mode, user, open])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (mode === "create") {
      if (!formData.name.trim()) {
        newErrors.name = "Name is required"
      }

      if (!formData.email.trim()) {
        newErrors.email = "Email is required"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address"
      }

      if (formData.password && formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters"
      }
    }

    if (formData.roles.length === 0) {
      newErrors.roles = "At least one role must be selected"
    }

    if (!formData.roles.includes("MEMBER")) {
      newErrors.roles = "Member role is required for all users"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRoleChange = (role: Role, checked: boolean) => {
    if (role === "MEMBER") {
      // MEMBER cannot be unchecked
      return
    }

    if (role === "ADMIN") {
      if (checked) {
        // If selecting ADMIN, replace all roles with ADMIN + MEMBER
        setFormData((prev) => ({
          ...prev,
          roles: ["ADMIN", "MEMBER"],
        }))
      } else {
        // If deselecting ADMIN, keep only MEMBER
        setFormData((prev) => ({
          ...prev,
          roles: ["MEMBER"],
        }))
      }
      return
    }

    // For other roles
    if (checked) {
      // If ADMIN is currently selected, don't allow adding other roles
      if (formData.roles.includes("ADMIN")) {
        return
      }
      setFormData((prev) => ({
        ...prev,
        roles: [...prev.roles.filter(r => r !== role), role],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        roles: prev.roles.filter((r) => r !== role),
      }))
    }

    // Clear role errors when roles change
    if (errors.roles) {
      setErrors(prev => ({ ...prev, roles: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (mode === "create") {
        await createUserMutation.mutateAsync(formData)
        toast({
          title: "User Created",
          description: "The user has been created successfully.",
        })
      } else if (mode === "edit" && user) {
        await updateUserMutation.mutateAsync({
          id: user.id,
          data: { roles: formData.roles },
        })
        toast({
          title: "User Updated",
          description: "The user has been updated successfully.",
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const isLoading = createUserMutation.isPending || updateUserMutation.isPending
  const hasAdminRole = formData.roles.includes("ADMIN")

  const renderRoleSection = (title: string, roles: Role[], description?: string) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        {description && (
          <Badge variant="outline" className="text-xs">
            {description}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {roles.map((role) => {
          const isChecked = formData.roles.includes(role)
          const isDisabled = role === "USER" || (hasAdminRole && role !== "ADMIN" && role !== "MEMBER")

          return (
            <div key={role} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id={role}
                checked={isChecked}
                onCheckedChange={(checked) => handleRoleChange(role, checked as boolean)}
                disabled={isDisabled}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {roleIcons[role]}
                  <Label
                    htmlFor={role}
                    className={`text-sm font-medium cursor-pointer ${
                      isDisabled ? "text-muted-foreground" : ""
                    }`}
                  >
                    {roleLabels[role]}
                    {role === "MEMBER" && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Required
                      </Badge>
                    )}
                    {role === "ADMIN" && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Supersedes all
                      </Badge>
                    )}
                    {isDisabled && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Covered by Admin
                      </Badge>
                    )}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? "Create New User" : "Edit User"}
            {mode === "edit" && user && (
              <Badge variant="outline">{user.name}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new user and assign roles. Member role is required for all users."
              : "Update user roles. Member role is required and cannot be removed."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "create" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                      if (errors.name) {
                        setErrors(prev => ({ ...prev, name: undefined }))
                      }
                    }}
                    className={errors.name ? "border-red-500" : ""}
                    placeholder="Enter full name"
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: undefined }))
                      }
                    }}
                    className={errors.email ? "border-red-500" : ""}
                    placeholder="user@example.com"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="p-0 h-auto font-normal"
                >
                  {showAdvancedOptions ? "Hide" : "Show"} Advanced Options
                </Button>
                
                {showAdvancedOptions && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, password: e.target.value }))
                          if (errors.password) {
                            setErrors(prev => ({ ...prev, password: undefined }))
                          }
                        }}
                        className={errors.password ? "border-red-500" : ""}
                        placeholder="Leave blank for default password"
                      />
                      {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urlAvatar">Avatar URL</Label>
                      <Input
                        id="urlAvatar"
                        value={formData.urlAvatar}
                        onChange={(e) => setFormData((prev) => ({ ...prev, urlAvatar: e.target.value }))}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label className="text-base font-medium">User Roles</Label>
    <Badge variant="outline" className="text-xs">
      {formData.roles.length} selected
    </Badge>
  </div>

  <IncludeExcludeList
    items={allRoleItems}
    selectedItems={formData.roles}
    onSelectionChange={(newSelectedKeys: string[]) => {
      setFormData((prev) => ({ ...prev, roles: newSelectedKeys as Role[] }));
      if (errors.roles) {
        setErrors((prev) => ({ ...prev, roles: undefined }));
      }
    }}
    availableTitle="Available Roles"
    selectedTitle="Assigned Roles"
    defaultItems={["MEMBER"]} // MEMBER is default and not removable
    validation={roleValidation}
    showValidation={true}
    valueType="string" // Since roles are string enums
    categoryFilter={true}
    height="h-[300px]" // Adjust height as needed
    // Custom item renderer to include icons and special badges
    itemRenderer={(item: ListItem) => (
      <div className="flex items-center gap-2">
        {(item.metadata?.icon as React.ReactNode)}
        <span>{item.label}</span>
        {item.key === "MEMBER" && (
          <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
        )}
        {item.key === "ADMIN" && (
          <Badge variant="destructive" className="ml-2 text-xs">Supersedes all</Badge>
        )}
        {item.metadata?.isSuperceding && formData.roles.includes("ADMIN") && item.key !== "ADMIN" && item.key !== "MEMBER" && (
          <Badge variant="outline" className="ml-2 text-xs">Covered by Admin</Badge>
        )}
      </div>
    )}
  />

  <Alert>
    <Info className="h-4 w-4" />
    <AlertDescription>
      <strong>Note:</strong> Member role is required for all users and cannot be removed.
      Admin role automatically includes all permissions from other roles.
    </AlertDescription>
  </Alert>
</div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Saving..." : mode === "create" ? "Create User" : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}