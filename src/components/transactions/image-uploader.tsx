"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { cn } from "#@/lib/utils/utils.ts";
import { Input } from "@/components/ui/input";

interface ImageUploaderProps {
  onFilesChange: (files: File[]) => void;
  existingUrls?: string[];
  maxFiles?: number;
  maxSize?: number;
}

export default function ImageUploader({
  onFilesChange,
  existingUrls = [],
  maxFiles = 5,
  maxSize = 5, // in MB
}: ImageUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  const isMounted = useRef(false);

  // Cleanup object URLs
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const getImageUrls = useCallback(() => {
    return [
      ...existingUrls,
      ...files.map(file => URL.createObjectURL(file))
    ];
  }, [existingUrls, files]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remainingSlots = maxFiles - (files.length + existingUrls.length);
      if (remainingSlots <= 0) return;

      const validFiles = acceptedFiles
        .filter(file => file.size <= maxSize * 1024 * 1024)
        .slice(0, remainingSlots);

      setFiles(prev => [...prev, ...validFiles]);
    },
    [files.length, existingUrls.length, maxFiles, maxSize]
  );

  const removeImage = useCallback(
    (index: number, type: "existing" | "new") => {
      if (type === "existing") {
        const updatedExisting = [...existingUrls];
        updatedExisting.splice(index, 1);
        onFilesChange([...files, ...updatedExisting.map(() => new File([], "placeholder"))]);
      } else {
        const updatedFiles = [...files];
        const removedFile = updatedFiles.splice(index, 1)[0];
        setFiles(updatedFiles);
        
        // Cleanup object URL
        const urlIndex = objectUrlsRef.current.findIndex(
          url => url === URL.createObjectURL(removedFile)
        );
        if (urlIndex !== -1) {
          URL.revokeObjectURL(objectUrlsRef.current[urlIndex]);
          objectUrlsRef.current.splice(urlIndex, 1);
        }
      }
    },
    [files, existingUrls, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles,
    maxSize: maxSize * 1024 * 1024,
  });

  // Handle file changes
  useEffect(() => {
    if (files.length > 0) {
      onFilesChange(files);
    }
  }, [files, onFilesChange]);

  const allImages = getImageUrls();
  const isMaxFilesReached = allImages.length >= maxFiles;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-primary/50 hover:bg-muted/50",
          isMaxFilesReached && "opacity-50 cursor-not-allowed"
        )}
        aria-disabled={isMaxFilesReached}
      >
        <Input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive
              ? "Lepaskan file di sini"
              : "Tarik dan lepaskan foto, atau klik untuk memilih"}
          </p>
          <p className="text-xs text-muted-foreground">
            Maksimal {maxFiles} foto, format JPG, PNG, WEBP (maks. {maxSize}MB per foto)
          </p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="text-red-500 text-sm">
          {fileRejections.map(({ errors }) =>
            errors.map(e => (
              <p key={e.code} className="flex items-center gap-1">
                <X className="h-4 w-4" /> {e.message}
              </p>
            ))
          )}
        </div>
      )}

      {allImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {existingUrls.map((url, index) => (
            <Card key={`existing-${index}`} className="relative overflow-hidden h-48 group">
              <div className="absolute inset-0">
                <Image
                  src={url}
                  alt={`Existing image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index, "existing")}
                aria-label={`Hapus gambar ${index + 1}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}

          {files.map((file, index) => {
            const url = URL.createObjectURL(file);
            if (!objectUrlsRef.current.includes(url)) {
              objectUrlsRef.current.push(url);
            }
            
            return (
              <Card key={`new-${index}`} className="relative overflow-hidden h-48 group">
                <div className="absolute inset-0">
                  <Image
                    src={url}
                    alt={`Uploaded image ${existingUrls.length + index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index, "new")}
                  aria-label={`Hapus gambar ${existingUrls.length + index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                  {file.name}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}