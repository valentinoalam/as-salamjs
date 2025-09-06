import type React from "react"
import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "Manajemen Keuangan | Qurban Management System",
  description: "Kelola keuangan untuk kegiatan qurban",
}
export default function KeuanganLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}