import type React from "react"
import type { Viewport } from "next"
import { Inter } from "next/font/google"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/layout/providers/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Footer } from "@/components/layout/footer"
import { JsonLd } from "#@/lib/schemas_org/index.ts"
import { generateMetaData } from "#@/lib/utils/metadata.ts"
import { NextAuthProvider } from "@/components/layout/providers/next-auth-provider"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]/route"
import { AuthProvider } from "@/components/layout/providers/auth-provider"

const inter = Inter({ subsets: ["latin"] })

const mosqueSchema = {
  "@id": "https://as-salamjs.online",
  "@context": "https://schema.org",
  "@type": ["Place","PlaceOfWorship","Mosque"],
  "name": "Masjid As-Salam Jakasampurna",
  "description": "Masjid As-Salam Jakasampurna is a mosque in Bekasi, Indonesia, serving as a place for worship and community activities.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Jl. Raya Jakasampurna IV",
    "addressLocality": "Jakasampurna",
    "addressRegion": "Bekasi",
    "postalCode": "17145",
    "addressCountry": "ID"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -6.2451448,
    "longitude": 106.9695972
  },
  "url": "https://as-salamjs.online",
  "sameAs": [
    "https://www.google.com/maps/place/Masjid+As+Salam+Jakasampurna/@-6.2451448,106.9695972",
    "https://www.youtube.com/@MasjidAsSalam",
    "https://www.instagram.com/assalam_jakasampurna/"
  ],
  "telephone": "+62-21-12345678",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      "opens": "04:00",
      "closes": "22:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Friday",
      "opens": "11:00",
      "closes": "13:30",
      "description": "Friday Prayer (Jumu'ah)"
    }
  ],
  "image": "https://as-salamjs.online/images/masjid-as-salam.jpg",
  "isAccessibleForFree": true,
  "publicAccess": true,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "50"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://as-salamjs.online/search?q={search_term_string}"
    },
    "query-input": "required name=search_term"
  },
  "amenityFeature": [
    {
      "@type": "LocationFeatureSpecification",
      "name": "Prayer Hall",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Ablution Facilities",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Community Events",
      "value": true
    }
  ]
}
export async function generateMetadata() {
  return generateMetaData();
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: 'white',
  // interactiveWidget: 'resizes-visual',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add global schema markup */}
        <JsonLd schema={mosqueSchema} />
      </head>
      <body className={inter.className}>
        <NextAuthProvider session={session}>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
              {children}
              <Footer />
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}
