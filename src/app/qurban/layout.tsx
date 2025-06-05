import type React from "react"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"
import Header from "@/components/layout/header"
import Link from "next/link"

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
      <main className="min-h-screen font-['Poppins'] bg-white">{children}</main>
      <Toaster />
      {/* Footer */}
      <footer className="py-6 bg-gray-900 text-center text-white">
        <p className="m-0">Copyright &copy; 2025. <Link href="https://tinokarya.com">TinoKarya</Link></p>
      </footer>
    </div>

  )
}
