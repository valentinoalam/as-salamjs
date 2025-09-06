/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useSettingsStore } from "@/stores/settings-store" // Import useSettingsStore
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  Trash2,
  Check,
  Eye,
  Calendar,
  FileImage, // Renamed to avoid conflict with Image component
  Plus,
  Star,
  Info,
  X,
  RefreshCw,
  Image as ImageIcon,
  GalleryHorizontal,
  ImageOff
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { cn } from "#@/lib/utils/utils.ts"
import { Separator } from "@/components/ui/separator"
import type { HeroImage } from "#@/types/settings.ts"

interface HeroImageGalleryProps {
  onClose?: () => void;
  onImagesUpdated?: () => void; // Callback for parent (LandingPageSettings)
}
export default function HeroImageGallery({ onClose, onImagesUpdated }: HeroImageGalleryProps) {
  const {
    useCarousel,
    selectedHeroImageIds,
    updateSetting, // To update useCarousel setting in the store
  } = useSettingsStore();

  const [allAvailableHeroImages, setAllAvailableHeroImages] = useState<HeroImage[]>([]);
  const [isLoadingImagesLocal, setIsLoadingImagesLocal] = useState(false);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false); // Local upload state
  const [previewDialog, setPreviewDialog] = useState<string | null>(null); // Local preview state
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [gallerySelectedImageIds, setGallerySelectedImageIds] = useState<Set<string>>(new Set());

  // --- Local Image Operations (Moved from store, now defined here) ---

  // Function to fetch all hero images from the API
  const fetchAllHeroImages = useCallback(async () => {
    setIsLoadingImagesLocal(true);
    try {
      const response = await fetch("/api/settings/hero-images"); // Hitting the new GET route
      if (response.ok) {
        const images: HeroImage[] = await response.json();
        setAllAvailableHeroImages(images);
      } else {
        throw new Error("Failed to fetch hero images from API");
      }
    } catch (error) {
      console.error("Error fetching all hero images:", error);
      toast.error("Gagal memuat gambar hero");
      setAllAvailableHeroImages([]);
    } finally {
      setIsLoadingImagesLocal(false);
    }
  }, []); // No dependencies for this simple fetch

  // Generic upload file function (sends raw file to backend)
  const uploadFileToServer = useCallback(async (file: File, type: "logo" | "hero"): Promise<HeroImage> => {
    setIsUploadingLocal(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    // Get client-side dimensions if possible
    const img = new window.Image();
    const reader = new FileReader();
    reader.readAsDataURL(file);
    await new Promise(resolve => {
        reader.onload = (e) => {
            img.src = e.target?.result as string;
            img.onload = () => resolve(null);
        };
    });
    formData.append("width", img.width.toString());
    formData.append("height", img.height.toString());


    const response = await fetch("/api/settings/upload", { // Hitting the file upload route
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data; // Returns { url, width, height }
    }
    throw new Error("File upload failed");
  }, []);

  // Upload hero image (orchestrates file upload and then DB record creation)
  const uploadHeroImageLocally = useCallback(async (file: File) => {
    setIsUploadingLocal(true);
    try {
      const uploadResult = await uploadFileToServer(file, "hero"); // Upload file
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ key:"selectedHeroImageIds", value: uploadResult.id }),
      });
      if (response.ok) {
        const newImageFromDb: HeroImage = await response.json();
        await fetchAllHeroImages(); // Re-fetch all available images for gallery after DB update

        // Update selected IDs in the store based on current carousel mode
        const currentSelected = useSettingsStore.getState().selectedHeroImageIds;
        const useCarouselMode = useSettingsStore.getState().useCarousel;
        let newSelectedIds: string[] | string | null = null;

        if (!useCarouselMode) { // Single image mode
            newSelectedIds = newImageFromDb.id;
        } else { // Carousel mode
            if (Array.isArray(currentSelected)) {
                newSelectedIds = [...new Set([...currentSelected, newImageFromDb.id])];
            } else if (typeof currentSelected === 'string' && currentSelected !== null) {
                newSelectedIds = [currentSelected, newImageFromDb.id]; // Convert single to array with new
            } else {
                newSelectedIds = [newImageFromDb.id]; // Start with just the new image
            }
        }
        await useSettingsStore.getState().updateSetting("selectedHeroImageIds", JSON.stringify(newSelectedIds));
        onImagesUpdated?.(); // Notify parent component (LandingPageSettings) of updates
        toast.success("Gambar berhasil diupload!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add hero image to database.");
      }
    } catch (error: any) {
      console.error("Failed to upload hero image:", error);
      toast.error(`Gagal mengupload gambar: ${error.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsUploadingLocal(false);
    }
  }, [uploadFileToServer, fetchAllHeroImages, onImagesUpdated]);


  // Delete hero image function (sends delete request to backend)
  const deleteHeroImageLocally = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`, { // Hitting the DELETE route
        method: "DELETE",
      });

      if (response.ok) {
        console.log(`Successfully deleted image with ID: ${imageId}`);
        await fetchAllHeroImages(); // Re-fetch all available images for gallery after DB update

        // Update selected IDs in the store if the deleted image was part of the selection
        const currentSelected = useSettingsStore.getState().selectedHeroImageIds;
        let updatedSelected: string | string[] | null = null;

        if (typeof currentSelected === 'string' && currentSelected === imageId) {
            updatedSelected = null;
        } else if (Array.isArray(currentSelected)) {
            const filtered = currentSelected.filter(id => id !== imageId);
            updatedSelected = filtered.length > 0 ? filtered : [];
        }
        await useSettingsStore.getState().updateSetting("selectedHeroImageIds", JSON.stringify(updatedSelected));
        onImagesUpdated?.(); // Notify parent component (LandingPageSettings) of updates
        toast.success("Gambar berhasil dihapus");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete hero image with ID: ${imageId}`);
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(`Gagal menghapus gambar: ${error.message || 'Terjadi kesalahan'}`);
    }
  }, [fetchAllHeroImages, onImagesUpdated]);

  // Initial load of all available hero images for the gallery
  useEffect(() => {
    fetchAllHeroImages();
  }, [fetchAllHeroImages]);

  // Get active hero images based on current selection
  const activeHeroImages = useCallback(() => {
    if (useCarousel && Array.isArray(selectedHeroImageIds)) {
      return allAvailableHeroImages.filter(img => selectedHeroImageIds.includes(img.id));
    } else if (!useCarousel && typeof selectedHeroImageIds === 'string' && selectedHeroImageIds !== null) {
      return allAvailableHeroImages.filter(img => img.id === selectedHeroImageIds);
    }
    return [];
  }, [useCarousel, selectedHeroImageIds, allAvailableHeroImages])();

  // Sync local gallery selection with store's selected IDs whenever useCarousel or selectedHeroImageIds changes
  useEffect(() => {
    if (useCarousel && Array.isArray(selectedHeroImageIds)) {
      setGallerySelectedImageIds(new Set(selectedHeroImageIds));
    } else if (!useCarousel && typeof selectedHeroImageIds === 'string' && selectedHeroImageIds !== null) {
      setGallerySelectedImageIds(new Set([selectedHeroImageIds]));
    } else {
        setGallerySelectedImageIds(new Set());
    }
  }, [useCarousel, selectedHeroImageIds]);

  // Handle file input change or drag-drop
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang diizinkan");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }

    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return prev; }
        return prev + 10;
      });
    }, 200);

    try {
      await uploadHeroImageLocally(file); // Use the local upload function
      setUploadProgress(100);
      // Success toast is handled inside uploadHeroImageLocally
    } catch (error) {
      console.error(error)
      // Error toast is handled inside uploadHeroImageLocally
    } finally {
      setUploadProgress(0);
    }
  }, [uploadHeroImageLocally]);


  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Handle bulk delete for selected images
  const handleBulkDelete = useCallback(async () => {
    const imagesToDelete = Array.from(gallerySelectedImageIds);
    try {
      for (const imageId of imagesToDelete) {
        await deleteHeroImageLocally(imageId);
      }
      setGallerySelectedImageIds(new Set());
      toast.success(`Berhasil menghapus ${imagesToDelete.length} gambar`);
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      toast.error(`Gagal menghapus beberapa gambar: ${error.message || 'Terjadi kesalahan'}`);
    }
  }, [gallerySelectedImageIds, deleteHeroImageLocally]);

  // Handle single image delete
  const handleDeleteImage = useCallback(async (imageId: string) => {
    await deleteHeroImageLocally(imageId);
  }, [deleteHeroImageLocally]);

  const handleApplySelection = async () => {
    try {
      let finalSelectedIds: string | string[] | null = null;
      if (useCarousel) {
        finalSelectedIds = Array.from(gallerySelectedImageIds);
        toast.success(`Berhasil menyimpan ${gallerySelectedImageIds.size} gambar untuk carousel.`);
      } else {
        finalSelectedIds = gallerySelectedImageIds.values().next().value || null;
        toast.success(`Berhasil memilih gambar hero utama.`);
      }
      // Update the settings store with the new selection
      await useSettingsStore.getState().updateSetting("selectedHeroImageIds", JSON.stringify(finalSelectedIds));
      onClose?.();
      onImagesUpdated?.(); // Notify parent of selection changes
    } catch (error: any) {
      console.error("Error applying selection:", error);
      toast.error(`Gagal menyimpan pilihan gambar: ${error.message || 'Terjadi kesalahan'}`);
    }
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const toggleImageSelection = (imageId: string) => {
    setGallerySelectedImageIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
      } else {
        if (!useCarousel) {
          newSelection.clear();
        }
        newSelection.add(imageId);
      }
      return newSelection;
    });
  };

  const isImageActive = (imageId: string) => {
    if (useCarousel) {
      return Array.isArray(selectedHeroImageIds) && selectedHeroImageIds.includes(imageId);
    } else {
      return typeof selectedHeroImageIds === 'string' && selectedHeroImageIds === imageId;
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="gap-1">
              <ImageIcon className="w-3 h-3" />
              {allAvailableHeroImages.length} Total
            </Badge>
          </div>
          {gallerySelectedImageIds.size > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {gallerySelectedImageIds.size} dipilih
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Hapus Terpilih
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Gambar Terpilih</AlertDialogTitle>
                    <AlertDialogDescription>
                      Apakah Anda yakin ingin menghapus {gallerySelectedImageIds.size} gambar yang dipilih?
                      Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>
                      Hapus Semua
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
           <Button
            variant={useCarousel ? "default" : "outline"}
            size="sm"
            onClick={() => updateSetting("useCarousel", "true")}
            className="gap-1"
          >
            <GalleryHorizontal className="w-4 h-4" /> Carousel
          </Button>
          <Button
            variant={!useCarousel ? "default" : "outline"}
            size="sm"
            onClick={() => updateSetting("useCarousel", "false")}
            className="gap-1"
          >
            <ImageOff className="w-4 h-4" /> Single
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchAllHeroImages()} disabled={isLoadingImagesLocal}>
            <RefreshCw className={cn("w-4 h-4", isLoadingImagesLocal && "animate-spin")} />
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-0">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300",
              dragOver ? "border-blue-500 bg-blue-50" : "border-muted-foreground/25",
              isUploadingLocal && "opacity-50 pointer-events-none",
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <div className={cn(
                "w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center mb-4 transition-colors",
                dragOver ? "border-blue-500 bg-blue-100" : "border-gray-300"
              )}>
                <Upload className={cn(
                  "h-8 w-8 transition-colors",
                  dragOver ? "text-blue-600" : "text-gray-400"
                )} />
              </div>

              <h3 className="font-semibold text-lg mb-2">
                {isUploadingLocal ? "Mengupload..." : "Upload Hero Image"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop gambar di sini atau klik untuk memilih file
              </p>

              {uploadProgress > 0 && (
                <div className="w-full max-w-xs mb-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center mt-1 text-muted-foreground">
                    {uploadProgress}% selesai
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Button
                  variant="default"
                  disabled={isUploadingLocal}
                  onClick={() => document.getElementById("hero-file-input")?.click()}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pilih File
                </Button>
                <input
                  id="hero-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={isUploadingLocal}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Info className="w-3 h-3" />
                PNG, JPG, WEBP hingga 10MB • Rekomendasi: 1920x1080px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Active Image / Selected for Carousel */}
      {activeHeroImages.length > 0 && (
        <Card className="overflow-hidden border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Star className="w-5 h-5 text-green-600" />
                  {useCarousel ? "Gambar Carousel Aktif" : "Hero Image Aktif"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {useCarousel
                    ? `Gambar-gambar ini akan ditampilkan sebagai carousel di halaman utama (${activeHeroImages.length} gambar terpilih)`
                    : "Gambar ini sedang ditampilkan di halaman utama"}
                </p>
              </div>
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <Check className="w-3 h-3 mr-1" />
                Aktif
              </Badge>
            </div>
            {useCarousel ? (
              // Display selected carousel images
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto pr-2">
                {activeHeroImages.map((image) => (
                  <div key={image.id} className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={image.url || "/placeholder.svg"}
                      alt={image.filename || "Carousel Image"}
                      fill
                      className="object-cover"
                    />
                     <div className="absolute top-2 right-2">
                        <Badge className="text-xs bg-white text-gray-800 backdrop-blur-sm">
                            {image.width}x{image.height}
                        </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Display single active image
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative aspect-[2/1] w-full rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={activeHeroImages[0]?.url || "/placeholder.svg"}
                      alt={activeHeroImages[0]?.filename || "Active Hero Image"}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Informasi File</p>
                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Nama:</span>
                        <span className="font-medium truncate ml-2" title={activeHeroImages[0]?.filename}>
                          {activeHeroImages[0]?.filename}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ukuran (Placeholder):</span> {/* Size is not from DB directly */}
                        <span className="font-medium">{formatFileSize(activeHeroImages[0]?.size || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dimensi:</span>
                        <span className="font-medium">
                          {activeHeroImages[0]?.width}x{activeHeroImages[0]?.height}px
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Upload:</span>
                        <span className="font-medium">{formatDate(activeHeroImages[0]?.uploadedAt || "")}</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewDialog(activeHeroImages[0]?.url || null)}>
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Gallery */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg">Galeri Gambar</h3>
              <p className="text-sm text-muted-foreground">
                Kelola semua gambar hero yang tersedia. Pilih gambar untuk mode {useCarousel ? "carousel" : "single"}.
              </p>
            </div>
            <Button
                onClick={handleApplySelection}
                disabled={gallerySelectedImageIds.size === 0 && ((!useCarousel && selectedHeroImageIds === null) || (useCarousel && Array.isArray(selectedHeroImageIds) && selectedHeroImageIds.length === 0))}
                className="gap-2"
            >
                <Check className="w-4 h-4" /> Terapkan Pilihan ({gallerySelectedImageIds.size})
            </Button>
          </div>

          {isLoadingImagesLocal ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memuat gambar...</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : allAvailableHeroImages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-medium text-lg mb-2">Belum Ada Gambar</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Upload gambar pertama untuk memulai atau pastikan ada gambar di database dengan
                <code className="mx-1 px-1 bg-gray-100 rounded text-xs">relatedType=&quot;hero-banner&quot;</code>
              </p>
              <Button onClick={() => document.getElementById("hero-file-input")?.click()}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Gambar Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {allAvailableHeroImages.map((image) => {
                const isActive = isImageActive(image.id);
                const isPreview = previewDialog === image.url; // Use local previewDialog for gallery preview
                const isSelectedForGallery = gallerySelectedImageIds.has(image.id);

                return (
                  <Card
                    key={image.id}
                    className={cn(
                      "relative group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
                      isActive && "ring-2 ring-green-500 shadow-lg",
                      isPreview && !isActive && "ring-2 ring-blue-500",
                      isSelectedForGallery && !isActive && "ring-2 ring-purple-500"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-gray-100">
                        <Image
                          src={image.url || "/placeholder.svg"}
                          alt={image.filename || "Image"}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                        {/* Selection Checkbox/Indicator */}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={isSelectedForGallery}
                            onChange={() => toggleImageSelection(image.id)}
                            className="w-4 h-4 rounded border-white bg-white/90"
                          />
                        </div>

                        {/* Status Badges */}
                        <div className="absolute top-2 right-2 flex flex-col space-y-1">
                          {isActive && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <Check className="w-3 h-3 mr-1" />
                              Aktif
                            </Badge>
                          )}
                          {isPreview && !isActive && (
                            <Badge variant="secondary" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Badge>
                          )}
                           {image.width && image.height && (
                            <Badge variant="outline" className="text-xs bg-white/90">
                               {image.width}x{image.height}
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant={isSelectedForGallery ? "default" : "secondary"}
                              className="flex-1 text-xs h-7"
                              onClick={() => toggleImageSelection(image.id)}
                            >
                              {isSelectedForGallery ? "Terpilih" : "Pilih"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 w-7 p-0"
                              onClick={() => setPreviewDialog(image.url)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="h-7 w-7 p-0">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Gambar</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus gambar &quot;{image.filename || image.url.split('/').pop()}&quot;?
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteImage(image.id)}>
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>

                      {/* Image Info */}
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium truncate" title={image.filename || image.url}>
                          {image.filename || image.url.split('/').pop()}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{/* Size is not directly available from DB now */}</span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(image.uploadedAt)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewDialog} onOpenChange={() => setPreviewDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview Gambar
            </DialogTitle>
            <DialogDescription>
              {allAvailableHeroImages.find((img) => img.url === previewDialog)?.filename || allAvailableHeroImages.find((img) => img.url === previewDialog)?.url.split('/').pop()}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-gray-100">
            {previewDialog && (
              <Image
                src={previewDialog}
                alt="Preview"
                fill
                className="object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {(() => {
                  const image = allAvailableHeroImages.find((img) => img.url === previewDialog)
                  return image ? `${image.width}x${image.height}px • ${formatDate(image.uploadedAt)}` : ""
                })()}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setPreviewDialog(null)}>
                  Tutup
                </Button>
                <Button
                  onClick={() => {
                    const image = allAvailableHeroImages.find((img) => img.url === previewDialog)
                    if (image) {
                        setGallerySelectedImageIds(new Set([image.id])); // Select this single image
                        setPreviewDialog(null);
                        handleApplySelection(); // Apply selection immediately
                    }
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Pilih Sebagai Hero
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
