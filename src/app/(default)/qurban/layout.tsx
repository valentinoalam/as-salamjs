import type React from "react"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"
import Header from "@/components/layout/header"

export const metadata: Metadata = {
  title: "Qurban Management System",
  description: "A system to manage Qurban distribution and tracking",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto py-4 px-4 md:px-6">{children}</main>
        <Toaster />
    </div>

  )
}
