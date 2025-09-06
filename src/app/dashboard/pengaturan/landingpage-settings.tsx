/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useCallback, useEffect, useState } from "react"
import { useSettingsStore } from "@/stores/settings-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Plus, Trash2, Edit, Save, X, Upload, Eye, Settings, ImageIcon as ImageIconLucide, RefreshCw,
  ImageOff, GalleryHorizontal // New icons for single/carousel mode
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import HeroImageGallery from "@/components/qurban/hero-image-gallery"
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
import { Switch } from "@/components/ui/switch" // Assuming you have a Switch component
import { cn } from "#@/lib/utils/utils.ts"
import type { HeroImage } from "#@/types/settings.ts"

// A simple carousel component for preview purposes

const SimpleCarousel = ({ images, interval = 3000 }: { images: HeroImage[], interval?: number }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) {
      setCurrentIndex(0); // If only one image, keep index at 0
      return;
    }
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images, interval]);

  if (!images || images.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
        No images for carousel
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="relative w-full h-full">
      <Image
        src={currentImage.url || "/placeholder.svg"}
        alt={currentImage.filename || "Carousel image"}
        fill
        className="object-cover transition-opacity duration-1000 ease-in-out"
      />
       {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />
    </div>
  );
};


export default function LandingPageSettings() {
  const {
    heroTitle,
    heroSubtitle,
    isLoading,
    isSaving, // Use isSaving for general settings save operations
    loadSettings,
    updateSetting,
    resetToDefaults,
    useCarousel,
    selectedHeroImageIds,
    getActiveHeroImages,
  } = useSettingsStore();

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // New local state to hold all hero images from the database
  const [allAvailableHeroImages, setAllAvailableHeroImages] = useState<HeroImage[]>([]);

  // Function to fetch all hero images from the API (for the gallery and this component's active image logic)
  const fetchAllHeroImages = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/hero-images");
      if (response.ok) {
        const images: HeroImage[] = await response.json();
        setAllAvailableHeroImages(images);
      } else {
        throw new Error("Failed to fetch hero images from API");
      }
    } catch (error) {
      console.error("Error fetching all hero images for LandingPageSettings:", error);
      toast.error("Gagal memuat gambar hero untuk pratinjau.");
      setAllAvailableHeroImages([]);
    }
  }, []);

  useEffect(() => {
    loadSettings(); // Load settings from store (which fetches from DB for non-image settings)
    fetchAllHeroImages(); // Independently fetch all available hero images
  }, [loadSettings, fetchAllHeroImages]);

  const handleResetSettings = async () => {
    try {
      await resetToDefaults();
      toast.success("Pengaturan berhasil direset ke default");
      // After reset, re-fetch images to ensure consistency if selected IDs were changed
      fetchAllHeroImages();
    } catch (error) {
      toast.error("Gagal mereset pengaturan");
    }
  };

  // Get the actively selected hero images (single or multiple)
  const activeHeroImages = getActiveHeroImages(allAvailableHeroImages);

  const getPreviewDimensions = () => {
    switch (previewMode) {
      case 'mobile':
        return { width: 'max-w-sm', height: 'min-h-[300px]' };
      case 'tablet':
        return { width: 'max-w-lg', height: 'min-h-[250px]' };
      default:
        return { width: 'max-w-2xl', height: 'min-h-[200px]' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Determine current active image for info display (e.g., in "Status Preview")
  const infoDisplayImage = activeHeroImages[0];


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan Landing Page</h1>
          <p className="text-muted-foreground mt-1">
            Kelola pengaturan hero section untuk halaman utama sistem qurban
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Reset ke Default
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Pengaturan</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin mereset semua pengaturan ke nilai default?
                Tindakan ini akan menghapus semua perubahan yang telah dibuat.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetSettings}>
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Hero Settings */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Pengaturan Hero Section
          </CardTitle>
          <CardDescription>
            Atur gambar dan teks hero yang ditampilkan di halaman utama
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column - Form Controls */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hero-title" className="text-sm font-medium">
                    Judul Hero
                  </Label>
                  <Input
                    id="hero-title"
                    value={heroTitle}
                    onChange={(e) => updateSetting("heroTitle", e.target.value)}
                    placeholder="Masukkan judul hero yang menarik..."
                    className="transition-all focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Judul utama yang akan ditampilkan di hero section
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero-subtitle" className="text-sm font-medium">
                    Subjudul Hero
                  </Label>
                  <Textarea
                    id="hero-subtitle"
                    value={heroSubtitle}
                    onChange={(e) => updateSetting("heroSubtitle", e.target.value)}
                    placeholder="Masukkan deskripsi atau subjudul hero..."
                    rows={4}
                    className="transition-all focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deskripsi pendukung yang memberikan konteks lebih
                  </p>
                </div>

                <Separator className="my-6" />

                {/* New: Carousel Toggle */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="use-carousel" className="text-sm font-medium flex items-center gap-2">
                      {useCarousel ? <GalleryHorizontal className="w-4 h-4" /> : <ImageOff className="w-4 h-4" />}
                      Mode Tampilan Gambar Hero
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {useCarousel ? "Menggunakan beberapa gambar sebagai carousel." : "Menggunakan satu gambar utama."}
                    </p>
                  </div>
                  <Switch
                    id="use-carousel"
                    checked={useCarousel}
                    onCheckedChange={(checked) => updateSetting("use_carousel", checked ? "true" : "false")}
                  />
                </div>
                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Hero Images</Label>
                    <Badge variant="outline" className="gap-1">
                      <ImageIconLucide className="w-3 h-3" />
                      {activeHeroImages.length} {useCarousel ? "gambar terpilih" : "gambar aktif"}
                    </Badge>
                  </div>

                  <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-center gap-2 h-12 border-dashed border-2 hover:border-blue-300 hover:bg-blue-50 transition-all"
                      >
                        <ImageIconLucide className="w-5 h-5" />
                        Kelola Gambar Hero
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <ImageIconLucide className="w-5 h-5" />
                          Galeri Hero Images
                        </DialogTitle>
                        <DialogDescription>
                          Upload, pilih, dan kelola gambar hero untuk halaman utama
                        </DialogDescription>
                      </DialogHeader>
                      {/* Pass fetchAllHeroImages to the gallery so it can refresh its data */}
                      <HeroImageGallery onClose={() => setIsGalleryOpen(false)} onImagesUpdated={fetchAllHeroImages} />
                    </DialogContent>
                  </Dialog>

                  <p className="text-xs text-muted-foreground">
                    Klik untuk membuka galeri dan mengelola gambar hero.
                    Pilihan Anda akan diterapkan saat Anda menekan tombol &quot;Terapkan Pilihan&quot; di galeri.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Preview Hero</Label>
                <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    Desktop
                  </Button>
                  <Button
                    variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPreviewMode('tablet')}
                  >
                    Tablet
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    Mobile
                  </Button>
                </div>
              </div>

              <div className={cn(
                "mx-auto transition-all duration-300",
                getPreviewDimensions().width
              )}>
                <div className={cn(
                  "relative rounded-xl overflow-hidden shadow-lg bg-gray-100 border",
                  getPreviewDimensions().height
                )}>
                  {activeHeroImages.length > 0 ? ( // Check if there are any active images
                    <>
                      {/* Hero Image / Carousel */}
                      <div className="absolute inset-0">
                        {useCarousel ? (
                          <SimpleCarousel images={activeHeroImages} />
                        ) : (
                          <Image
                            src={activeHeroImages[0]?.url || "/placeholder.svg"}
                            alt={activeHeroImages[0]?.filename || "Hero Preview"}
                            fill
                            className="object-cover"
                            priority
                          />
                        )}
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />
                      </div>

                      {/* Hero Text Overlay */}
                      <div className="absolute inset-0 flex items-center justify-start p-8">
                        <div className="max-w-lg space-y-4">
                          <h1 className={cn(
                            "font-bold text-white leading-tight",
                            previewMode === 'mobile' ? 'text-2xl' :
                            previewMode === 'tablet' ? 'text-3xl' : 'text-4xl'
                          )}>
                            {heroTitle || "Judul Hero"}
                          </h1>
                          <p className={cn(
                            "text-white/90 leading-relaxed",
                            previewMode === 'mobile' ? 'text-sm' : 'text-base'
                          )}>
                            {heroSubtitle || "Subjudul hero akan muncul di sini"}
                          </p>
                          <div className="flex gap-3 pt-2">
                            <Button className="bg-white text-gray-900 hover:bg-gray-100">
                              Mulai Sekarang
                            </Button>
                            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
                              Pelajari Lebih
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Active Image Info (small badge at bottom-right) */}
                      {infoDisplayImage && (
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 text-white text-xs">
                              <Badge variant="secondary" className="bg-green-500 text-white border-0 text-xs">
                                Aktif
                              </Badge>
                              <span className="truncate max-w-32">
                                {useCarousel ? `Carousel (${activeHeroImages.length} images)` : infoDisplayImage.filename || infoDisplayImage.url.split('/').pop()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Empty State */
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                          <ImageIconLucide className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-medium text-gray-600">
                            {heroTitle || "Judul Hero"}
                          </h3>
                          <p className="text-sm text-gray-500 max-w-xs">
                            {heroSubtitle || "Subjudul hero akan muncul di sini"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsGalleryOpen(true)}
                          className="mt-4"
                        >
                          <ImageIconLucide className="w-4 h-4 mr-2" />
                          Pilih Gambar Hero
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Status Preview:</span>
                  <div className="flex items-center gap-2">
                    {activeHeroImages.length > 0 ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700">Siap Ditampilkan</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-orange-700">Perlu Gambar Hero</span>
                      </>
                    )}
                  </div>
                </div>
                {infoDisplayImage && (
                  <div className="text-xs text-gray-600 border-t pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <span>{useCarousel ? `Total: ${activeHeroImages.length} gambar` : `File: ${infoDisplayImage.filename || infoDisplayImage.url.split('/').pop()}`}</span>
                      <span>Upload: {new Date(infoDisplayImage.uploadedAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
