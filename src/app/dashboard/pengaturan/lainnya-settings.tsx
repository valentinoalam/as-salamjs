/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState, useCallback } from "react"
import { useSettingsStore } from "@/stores/settings-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Edit, Save, X, ImageIcon, Upload, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner" // Assuming this is for toast notifications
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { CustomGroup, LogoSettings } from "#@/types/settings.ts"
import settingsApi from "#@/services/settings-service.ts" // Keep for logo/group specific updates if not handled by generic updateSetting in store
import { SettingsManager } from "#@/lib/manager/settings-manager.ts"

const LainnyaSettings = () => {
  const {
    logoImage,
    logoTitle,
    itemsPerGroup,
    customGroups,
    isLoading,
    loadSettings,
    updateSetting,
    addCustomGroup, // Added from store actions
    updateCustomGroup, // Added from store actions
    deleteCustomGroup, // Added from store actions
  } = useSettingsStore()

  // Form states
  const [logoForm, setLogoForm] = useState({
    logoTitle: "",
    isDirty: false,
    isSubmitting: false,
  })
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState({
    itemsPerGroup: 50,
    isDirty: false,
    isSubmitting: false,
  })

  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editGroupForm, setEditGroupForm] = useState<Partial<CustomGroup>>({})

  const [newGroup, setNewGroup] = useState({
    name: "",
    itemCount: 10,
    description: "",
    isActive: true,
  })

  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Form validation
  const validateLogoForm = () => {
    if (!logoForm.logoTitle.trim()) {
      toast.error("Organization/Event name is required")
      return false
    }
    if (logoForm.logoTitle.length > 100) {
      toast.error("Organization/Event name must be less than 100 characters")
      return false
    }
    return true
  }

  const validateGroupForm = () => {
    if (groupForm.itemsPerGroup < 1 || groupForm.itemsPerGroup > 100) {
      toast.error("Items per group must be between 1 and 100")
      return false
    }
    return true
  }

  const validateNewGroup = () => {
    if (!newGroup.name.trim()) {
      toast.error("Group name is required")
      return false
    }
    if (newGroup.name.length > 50) {
      toast.error("Group name must be less than 50 characters")
      return false
    }
    if (newGroup.itemCount < 1 || newGroup.itemCount > 1000) {
      toast.error("Item count must be between 1 and 1000")
      return false
    }
    if (newGroup.description && newGroup.description.length > 200) {
      toast.error("Description must be less than 200 characters")
      return false
    }
    return true
  }

  // Initialize form data
  useEffect(() => {
    if (!isLoading) {
      setLogoForm(prev => ({
        ...prev,
        logoTitle: logoTitle || "",
        isDirty: false,
      }))
      setGroupForm(prev => ({
        ...prev,
        itemsPerGroup: itemsPerGroup || 50,
        isDirty: false,
      }))
    }
  }, [logoTitle, itemsPerGroup, isLoading])

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Handlers

  // Handles updating logo title and image related settings
  const handleLogoSubmit = async () => {
    if (!validateLogoForm()) return

    setLogoForm(prev => ({ ...prev, isSubmitting: true }))
    const logoDTO: Partial<LogoSettings> = {}
    if(logoForm.logoTitle) logoDTO.logoTitle = logoForm.logoTitle
    if (uploadedImage) logoDTO.logoImage = uploadedImage
    try {
      await SettingsManager.setLogoSettings(logoDTO);
      if (logoDTO) {
        for (const [key, value] of Object.entries(logoDTO)) {
          await updateSetting(key, value)
        }
        setLogoForm(prev => ({ ...prev, isDirty: false }))
      } else {
        // settingsApi.updateLogoSettings already displays an error toast
      }
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while updating logo settings")
    } finally {
      setLogoForm(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  // Handles updating items per group setting
  const handleGroupSubmit = async () => {
    if (!validateGroupForm()) return

    setGroupForm(prev => ({ ...prev, isSubmitting: true }))

    try {
      // settingsApi handles the API call and toasts
      const response = await settingsApi.updateGroupSettings({
        itemsPerGroup: groupForm.itemsPerGroup,
      })

      if (response.success) {
        // Manually update the store state if the API call doesn't do it automatically
        await updateSetting('itemsPerGroup', String(groupForm.itemsPerGroup)) // Update individual setting in store, ensure value is string
        
        setGroupForm(prev => ({ ...prev, isDirty: false }))
        // settingsApi.updateGroupSettings already displays a success toast
      } else {
        // settingsApi.updateGroupSettings already displays an error toast
      }
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while updating group settings")
    } finally {
      setGroupForm(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  // Handles uploading a new logo image
  const handleImageUpload = async (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error("Image size must be less than 5MB")
      return
    }

    setIsUploading(true)

    try {
      const response = await settingsApi.uploadLogo(file) // settingsApi handles API call and toasts
      if (response.success && response.data)
        setUploadedImage(response.data.url)
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while uploading logo")
    } finally {
      setIsUploading(false)
    }
  }

  // Handles adding a new custom group using the store action
  const handleAddGroup = async () => {
    if (!validateNewGroup()) return

    try {
      // Use the store action directly, it handles API call and store update
      await addCustomGroup({
        name: newGroup.name,
        itemCount: newGroup.itemCount,
        description: newGroup.description,
        isActive: newGroup.isActive,
        // id, createdAt, updatedAt are generated by the backend/store
      })
      setNewGroup({ name: "", itemCount: 10, description: "", isActive: true })
      setIsAddGroupOpen(false)
      toast.success("Custom group added successfully") // Display toast here as store action doesn't return ApiResponse directly
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while adding group")
    }
  }

  // Handles updating an existing custom group using the store action
  const handleUpdateGroup = async (id: string, updates: Partial<CustomGroup>) => {
    try {
      // Use the store action directly, it handles API call and store update
      await updateCustomGroup(id, updates)
      setEditingGroup(null)
      setEditGroupForm({})
      toast.success("Custom group updated successfully") // Display toast here
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while updating group")
    }
  }

  // Handles deleting a custom group using the store action
  const handleDeleteGroup = async (id: string) => {
    try {
      // Use the store action directly, it handles API call and store update
      await deleteCustomGroup(id)
      toast.success("Custom group deleted successfully") // Display toast here
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while deleting group")
    } finally {
      setDeleteGroupId(null)
    }
  }

  // Handles resetting all settings to defaults
  const handleResetToDefaults = async () => {
    setIsResetting(true)

    try {
      const response = await settingsApi.resetToDefaults() // settingsApi handles API call and toasts

      if (response.success) {
        await loadSettings() // Reload all settings into the store after reset
        // settingsApi.resetToDefaults already displays a success toast
      } else {
        // settingsApi.resetToDefaults already displays an error toast
      }
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while resetting settings")
    } finally {
      setIsResetting(false)
    }
  }

  // Memoized callbacks for editing groups
  const startEditGroup = useCallback((group: CustomGroup) => {
    setEditingGroup(group.id)
    setEditGroupForm(group)
  }, [])

  const cancelEditGroup = useCallback(() => {
    setEditingGroup(null)
    setEditGroupForm({})
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pengaturan Sistem</h1>
          <p className="text-muted-foreground">Kelola pengaturan logo, hero, dan grup untuk sistem qurban</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isResetting}>
              {isResetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset ke Default
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Settings to Default?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will reset all settings to their default values. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetToDefaults}>
                Reset Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Pengaturan Logo
          </CardTitle>
          <CardDescription>Atur logo dan nama organisasi atau event yang akan ditampilkan di header</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo-image">Upload Logo</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="logo-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => document.getElementById("logo-image")?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isUploading ? "Uploading..." : "Browse"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">PNG, JPG hingga 5MB. Rekomendasi: 200x60px</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-title">Name of Organization or Event</Label>
                <Input
                  id="logo-title"
                  value={logoForm.logoTitle}
                  onChange={(e) => {
                    setLogoForm(prev => ({
                      ...prev,
                      logoTitle: e.target.value,
                      isDirty: e.target.value !== logoTitle,
                    }))
                  }}
                  placeholder="Masukkan nama organisasi atau event"
                  maxLength={100}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{logoForm.logoTitle.length}/100 characters</span>
                </div>
              </div>

              {logoForm.isDirty && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleLogoSubmit}
                    disabled={logoForm.isSubmitting}
                    size="sm"
                  >
                    {logoForm.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogoForm(prev => ({
                        ...prev,
                        logoTitle: logoTitle || "",
                        isDirty: false,
                      }))
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Preview Logo</Label>
              <div className="border rounded-lg p-4 bg-gray-50 min-h-[120px] flex items-center justify-center">
                {logoImage ? (
                  <div className="relative w-32 h-16">
                    <Image
                      src={uploadedImage || logoImage}
                      alt="Logo Preview"
                      fill
                      className="object-contain"
                      onError={() => toast.error("Failed to load logo image")}
                    />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Logo will appear here</p>
                  </div>
                )}
              </div>
              {logoForm.logoTitle && (
                <div className="text-center p-2 bg-gray-50 rounded border">
                  <p className="font-medium">{logoForm.logoTitle}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Grup</CardTitle>
          <CardDescription>Atur jumlah item per grup dan kelola grup kustom</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="items-per-group">Items per Group (Default)</Label>
              <Input
                id="items-per-group"
                type="number"
                min="1"
                max="100"
                value={groupForm.itemsPerGroup}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value) || 1
                  setGroupForm(prev => ({
                    ...prev,
                    itemsPerGroup: value,
                    isDirty: value !== itemsPerGroup,
                  }))
                }}
              />
              <p className="text-sm text-muted-foreground">Default number of items to display per group</p>
            </div>

            {groupForm.isDirty && (
              <div className="flex gap-2">
                <Button
                  onClick={handleGroupSubmit}
                  disabled={groupForm.isSubmitting}
                  size="sm"
                >
                  {groupForm.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGroupForm(prev => ({
                      ...prev,
                      itemsPerGroup: itemsPerGroup || 10,
                      isDirty: false,
                    }))
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Custom Groups</h3>
              <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Group</DialogTitle>
                    <DialogDescription>Create a new custom group for organizing items</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Group Name *</Label>
                      <Input
                        id="group-name"
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        placeholder="Enter group name"
                        maxLength={50}
                      />
                      <div className="text-sm text-muted-foreground">
                        {newGroup.name.length}/50 characters
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-count">Item Count *</Label>
                      <Input
                        id="group-count"
                        type="number"
                        min="1"
                        max="1000"
                        value={newGroup.itemCount}
                        onChange={(e) => setNewGroup({ ...newGroup, itemCount: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-description">Description (Optional)</Label>
                      <Textarea
                        id="group-description"
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        placeholder="Enter group description"
                        maxLength={200}
                        rows={3}
                      />
                      <div className="text-sm text-muted-foreground">
                        {newGroup.description.length}/200 characters
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="group-active"
                        checked={newGroup.isActive}
                        onCheckedChange={(checked) => setNewGroup({ ...newGroup, isActive: checked })}
                      />
                      <Label htmlFor="group-active">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddGroupOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddGroup}>Add Group</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {customGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No custom groups created yet</p>
                <p className="text-sm">Create your first custom group to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {customGroups.map((group) => (
                  <Card key={group.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {editingGroup === group.id ? (
                            <div className="space-y-3">
                              <Input
                                value={editGroupForm.name || ""}
                                onChange={(e) => setEditGroupForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Group name"
                                maxLength={50}
                              />
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max="1000"
                                  value={editGroupForm.itemCount || 1}
                                  onChange={(e) =>
                                    setEditGroupForm(prev => ({ ...prev, itemCount: Number.parseInt(e.target.value) || 1 }))
                                  }
                                  placeholder="Item count"
                                  className="w-32"
                                />
                                <Input
                                  value={editGroupForm.description || ""}
                                  onChange={(e) => setEditGroupForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Description"
                                  maxLength={200}
                                  className="flex-1"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={editGroupForm.isActive ?? true}
                                  onCheckedChange={(checked) => setEditGroupForm(prev => ({ ...prev, isActive: checked }))}
                                />
                                <Label className="text-sm">Active</Label>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium">{group.name}</h4>
                                <Badge variant={group.isActive ? "default" : "secondary"}>
                                  {group.itemCount} items
                                </Badge>
                                {!group.isActive && <Badge variant="outline">Inactive</Badge>}
                              </div>
                              {group.description && (
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                              )}
                              {group.updatedAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last updated: {new Date(group.updatedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {editingGroup === group.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateGroup(group.id, editGroupForm)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditGroup}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEditGroup(group)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {/* Toggle active status directly */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateGroup(group.id, { isActive: !group.isActive })}
                              >
                                {group.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Group</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete &quot;{group.name}&quot;? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>View current system status and information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Custom Groups</Label>
              <p className="text-2xl font-bold">{customGroups.length}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Groups</Label>
              <p className="text-2xl font-bold">{customGroups.filter(g => g.isActive).length}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Default Items per Group</Label>
              <p className="text-2xl font-bold">{itemsPerGroup}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LainnyaSettings