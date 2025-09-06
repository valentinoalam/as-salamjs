/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState } from "react"
import { MapPin, Phone, Mail } from "lucide-react"
import Link from "next/link"

interface Address {
  id: string
  name: string
  street: string
  city: string
  province: string
  postalCode?: string
  country: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  isPrimary: boolean
}

export function Footer() {
  const [primaryAddress, setPrimaryAddress] = useState<Address | null>(null)

  useEffect(() => {
    fetchPrimaryAddress()
  }, [])

  const fetchPrimaryAddress = async () => {
    try {
      const response = await fetch("/api/address")
      const data = await response.json()
      const primary = data.addresses?.find((addr: Address) => addr.isPrimary)
      setPrimaryAddress(primary || data.addresses?.[0] || null)
    } catch (error) {
      console.error("Failed to fetch address:", error)
    }
  }

  const getMapUrl = (address: Address) => {
    if (address.latitude && address.longitude) {
      return `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${address.latitude},${address.longitude}`
    }
    const query = encodeURIComponent(`${address.street}, ${address.city}, ${address.province}, ${address.country}`)
    return `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${query}`
  }

  return (
    <footer className="bg-muted/50 border-t py-6 text-center text-white">
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sistem Manajemen Qurban</h3>
            <p className="text-sm text-muted-foreground">
              Platform terpadu untuk mengelola seluruh proses qurban dari pendaftaran hingga distribusi
            </p>

            {primaryAddress && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{primaryAddress.name}</p>
                    <p className="text-muted-foreground">{primaryAddress.street}</p>
                    <p className="text-muted-foreground">
                      {primaryAddress.city}, {primaryAddress.province} {primaryAddress.postalCode}
                    </p>
                    <p className="text-muted-foreground">{primaryAddress.country}</p>
                  </div>
                </div>

                {primaryAddress.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{primaryAddress.phone}</span>
                  </div>
                )}

                {primaryAddress.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{primaryAddress.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Map */}
          {primaryAddress && (
            <div className="space-y-4">
              <h4 className="text-md font-medium">Lokasi</h4>
              <div className="aspect-video rounded-lg overflow-hidden border">
                {primaryAddress.latitude && primaryAddress.longitude ? (
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${primaryAddress.longitude - 0.01},${primaryAddress.latitude - 0.01},${primaryAddress.longitude + 0.01},${primaryAddress.latitude + 0.01}&layer=mapnik&marker=${primaryAddress.latitude},${primaryAddress.longitude}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Lokasi"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Koordinat tidak tersedia</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t mt-8 pt-4">
          <p className="m-0 text-center text-sm text-muted-foreground">
            Copyright &copy; {new Date().getFullYear()} Online Sistem Manajemen Masjid. Hak Cipta <Link href="https://tinokarya.com">TinoKarya</Link>.
          </p>
        </div>
      </div>
    </footer>
  )
}
