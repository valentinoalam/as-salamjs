"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateUserProfile } from "./actions"
import type { Role } from "@prisma/client"

type User = {
  id: string
  name: string | null
  email: string | null
  urlAvatar?: string | null
  role: Role
}

interface ProfileFormProps {
  user: User
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.urlAvatar || "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate passwords match
      if (password && password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const result = await updateUserProfile({
        userId: user.id,
        urlAvatar: avatarUrl,
        password: password || undefined,
      })

      if (result.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        })

        // Reset password fields
        setPassword("")
        setConfirmPassword("")
      } else {
        throw new Error(result.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Update your profile settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} alt={user.name || "User"} />
              <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="font-medium text-lg">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Role: {user.role.replace("_", " ")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Enter a URL for your profile picture. For best results, use a square image.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Change Password</h3>
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave password fields empty if you don&apos;t want to change your password.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
