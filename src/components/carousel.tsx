"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import type { HeroImage } from "#@/types/settings.ts";

// --- SimpleCarousel Component ---
// This component displays images in a basic carousel fashion.
// It's included here for completeness but could be in its own file.
const SimpleCarousel = ({ images, interval = 3000 }: { images: HeroImage[], interval?: number }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) { // If 0 or 1 image, no need for carousel interval
      setCurrentIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);
    return () => clearInterval(timer); // Cleanup on unmount
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
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Optimize image loading
        className="object-cover transition-opacity duration-1000 ease-in-out"
        priority // Prioritize loading for LCP
      />
      {/* Overlay Gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />
    </div>
  );
};
export default SimpleCarousel