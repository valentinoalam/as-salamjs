"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import Image from "next/image"
import { X, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

interface ImageData {
  id: string
  url: string
  alt?: string
}

interface ImageUploadProps {
  relatedId: string
  relatedType: string
  existingImages?: ImageData[]
  onImagesChange?: (images: ImageData[]) => void
  maxFiles?: number
  className?: string
}

export function ImageUpload({
  relatedId,
  relatedType,
  existingImages = [],
  onImagesChange,
  maxFiles = 5,
  className = "",
}: ImageUploadProps) {
  const [images, setImages] = useState<ImageData[]>(existingImages)
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (images.length + acceptedFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} images allowed`)
        return
      }

      setUploading(true)

      try {
        const formData = new FormData()
        acceptedFiles.forEach((file) => {
          formData.append("files", file)
        })
        formData.append("relatedId", relatedId)
        formData.append("relatedType", relatedType)
        formData.append("alt", `${relatedType} image`)

        const response = await fetch("/api/images/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to upload images")
        }

        const result = await response.json()
        const newImages = [...images, ...result.images]
        setImages(newImages)
        onImagesChange?.(newImages)
        toast.success("Images uploaded successfully")
      } catch (error) {
        console.error("Error uploading images:", error)
        toast.error("Failed to upload images")
      } finally {
        setUploading(false)
      }
    },
    [images, maxFiles, relatedId, relatedType, onImagesChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: uploading || images.length >= maxFiles,
  })

  const removeImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images?id=${imageId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      const newImages = images.filter((img) => img.id !== imageId)
      setImages(newImages)
      onImagesChange?.(newImages)
      toast.success("Image removed successfully")
    } catch (error) {
      console.error("Error removing image:", error)
      toast.error("Failed to remove image")
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {images.length < maxFiles && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="text-sm text-muted-foreground">
                  {uploading ? (
                    "Uploading images..."
                  ) : isDragActive ? (
                    "Drop the images here..."
                  ) : (
                    <>
                      Drag & drop images here, or <span className="text-primary font-medium">browse</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP up to 5MB ({images.length}/{maxFiles} images)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <Image
                    src={image.url || "/placeholder.svg"}
                    alt={image.alt || "Uploaded image"}
                    fill
                    className="object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
