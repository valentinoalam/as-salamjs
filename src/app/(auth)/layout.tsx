import type React from "react"
import { Suspense } from "react"


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
        {children}
    </Suspense>
  )
}
