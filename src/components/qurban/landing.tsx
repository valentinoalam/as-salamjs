"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import PemesananForm from "@/components/qurban/pemesanan/pemesanan-form"
import { useSettingsStore } from "@/stores/settings-store"
import type { TipeHewanWithImages } from "#@/types/qurban.ts"
import { useCallback, useEffect, useState } from "react"
import type { HeroImage } from "@/types/settings.ts"
import { ImageIcon, RefreshCw } from "lucide-react"
import SimpleCarousel from "../carousel"

interface QurbanLandingProps {
  tipeHewan: TipeHewanWithImages[]
}

export function QurbanLanding({ tipeHewan }: QurbanLandingProps) {
  const {
    heroTitle,
    heroSubtitle,
    useCarousel,
    selectedHeroImageIds,
    isLoading: settingsLoading // Global settings loading state
  } = useSettingsStore();

  // Renamed from allAvailableHeroImages to activeHeroImages, as we're now fetching only the active ones
  const [activeHeroImages, setActiveHeroImages] = useState<HeroImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true); // Local loading state for images

  // Function to fetch ONLY the active hero images based on selectedHeroImageIds
  const fetchActiveHeroImages = useCallback(async () => {
    setIsLoadingImages(true);
    try {
      let idsToFetch: string[] = [];

      if (useCarousel && Array.isArray(selectedHeroImageIds)) {
        idsToFetch = selectedHeroImageIds;
      } else if (!useCarousel && typeof selectedHeroImageIds === 'string' && selectedHeroImageIds !== null) {
        idsToFetch = [selectedHeroImageIds];
      }

      if (idsToFetch.length === 0) {
        setActiveHeroImages([]);
        setIsLoadingImages(false);
        return;
      }

      // Make a POST request to the new /api/images/selected route
      const response = await fetch("/api/images/selected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: idsToFetch }),
      });

      if (response.ok) {
        const images: HeroImage[] = await response.json();
        // The API returns images in a default order (e.g., by createdAt asc).
        // If you need to preserve the order specified in selectedHeroImageIds,
        // you'll need to reorder them on the client-side.
        // Example reordering:
        const orderedImages = idsToFetch.map(id => images.find(img => img.id === id)).filter((img): img is HeroImage => !!img);
        setActiveHeroImages(orderedImages);
      } else {
        console.error("Failed to fetch selected hero images from API:", response.statusText);
        setActiveHeroImages([]);
      }
    } catch (error) {
      console.error("Error fetching selected hero images:", error);
      setActiveHeroImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  }, [useCarousel, selectedHeroImageIds]); // Dependencies: whenever carousel mode or selected IDs change

  // Fetch settings from the store and active images on mount and when dependencies change
  useEffect(() => {
    // This `useEffect` now focuses on fetching the *active* images.
    // `useSettingsStore().loadSettings()` should be called once at a higher level
    // (e.g., in a root layout or _app.tsx) to load the initial `useCarousel`
    // and `selectedHeroImageIds` values into the store.
    fetchActiveHeroImages();
  }, [fetchActiveHeroImages]);


  // Determine if content is still loading
  const isContentLoading = settingsLoading || isLoadingImages;
  return (
    <>
      {/* Hero Section */}
      <section id="home" className="relative h-screen flex bg-amber-300 items-center justify-center">
        {isContentLoading ? (
        // Loading state
        <div className="flex flex-col items-center justify-center text-white/70">
          <RefreshCw className="w-8 h-8 animate-spin mb-4" />
          <p className="text-lg">Memuat konten...</p>
        </div>
      ) : activeHeroImages.length > 0 ? (
        // Render hero content with image(s)
        <>
          {/* Background Image / Carousel */}
          <div className="absolute inset-0 z-0">
            {useCarousel ? (
              <SimpleCarousel images={activeHeroImages} />
            ) : (
              <Image
                src={activeHeroImages[0]?.url || "/placeholder.svg"}
                alt={activeHeroImages[0]?.filename || "Hero Image"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 100vw"
                className="object-cover bg-black"
                priority
              />
            )}
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Hero Content (Text and Buttons) */}
          <div className="relative z-10 p-4 max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight drop-shadow-lg">
              {heroTitle || "Selamat Datang di Sistem Manajemen Qurban"}
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed drop-shadow-md">
              {heroSubtitle || "Kelola qurban Anda dengan mudah dan efisien"}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-colors"
              >
                <Link href="#menu" >
                Pesan Sekarang
                </Link>
              </Button>
            </div>
          </div>
        </>
      ) : (
        // Empty state when no images are active
        <div className="relative z-10 flex flex-col items-center justify-center bg-black text-white/70 p-4 space-y-4">
          <ImageIcon className="w-16 h-16 mb-4" />
          <h2 className="text-2xl font-bold">Belum Ada Gambar Hero</h2>
          <p className="text-md text-center max-w-md">
            Silakan tambahkan dan pilih gambar hero melalui pengaturan untuk menampilkannya di sini.
          </p>
          {/* Optionally, add a button to open settings if this component can trigger it */}
          {/* <Button variant="outline" onClick={() => {/* Open settings modal/page */ /*}}>
            Buka Pengaturan Hero
          </Button> */}
        </div>
      )}
      </section>
      
      {/* Menu Section */}
      <section id="menu" className="py-20 bg-gray-900">
        <PemesananForm tipeHewan={tipeHewan} />
      </section>

      {/* Testimoni Section */}
      <section id="testimoni" className="py-20 text-white relative">
        <div className="absolute inset-0 z-0">
          <Image src="/images/hewanQurban/StockSnap_SQ99X727RI.jpg" alt="Quran Background" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <figure className="max-w-4xl mx-auto">
            <blockquote className="text-lg md:text-xl font-medium mb-6 leading-relaxed">
              &quot;Dan bagi setiap umat telah Kami syariatkan penyembelihan (qurban), agar mereka menyebut nama Allah atas
              rezeki yang dikaruniakan Allah kepada mereka berupa hewan ternak. Maka Tuhanmu adalah Tuhan Yang Maha Esa,
              karena itu berserah dirilah kamu kepada-Nya.&quot;
            </blockquote>
            <figcaption className="text-white font-bold text-xl">(QS: Al-Hajj: 34)</figcaption>
          </figure>
        </div>
      </section>
    </>
  )
}
