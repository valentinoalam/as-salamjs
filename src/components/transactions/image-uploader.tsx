"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Upload, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImagesChange: (urls: string[]) => void;
  existingImages: string[];
}

export function ImageUploader({ onImagesChange, existingImages = [] }: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // In a real application, you would upload these files to your server or cloud storage
    // and then use the returned URLs
    const newImageUrls = acceptedFiles.map(file => {
      // Create a URL for the dropped file
      // In production, you would replace this with the actual upload
      return URL.createObjectURL(file);
    });
    
    const updatedImages = [...images, ...newImageUrls];
    setImages(updatedImages);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 5,
  });
  
  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };
  
  // Mock function to simulate taking a photo
  const takePhoto = () => {
    // In a real application, you would access the device camera
    // For now, we'll just add a placeholder image
    const newImage = "https://images.pexels.com/photos/4473398/pexels-photo-4473398.jpeg";
    const updatedImages = [...images, newImage];
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive
              ? "Lepaskan file di sini"
              : "Tarik dan lepaskan foto, atau klik untuk memilih"}
          </p>
          <p className="text-xs text-muted-foreground">
            Maksimal 5 foto, format JPG, PNG, WEBP (maks. 5MB per foto)
          </p>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button type="button" variant="outline" onClick={takePhoto}>
          <Camera className="mr-2 h-4 w-4" />
          Ambil Foto dengan Kamera
        </Button>
      </div>
      
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {images.map((image, index) => (
            <Card key={index} className="relative overflow-hidden h-48 group">
              <div className="absolute inset-0">
                <Image
                  src={image}
                  alt={`Uploaded image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}