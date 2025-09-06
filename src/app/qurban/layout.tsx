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
    <div className="min-h-screen flex font-['Poppins'] flex-col">
      <Header />
      <main className="bg-white">{children}</main>
      <Toaster />
    </div>

  )
}
