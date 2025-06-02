"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { useEffect, useMemo, useState } from "react"
import { Role } from "@prisma/client"
import { checkAccess } from "@/app/actions"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User } from "lucide-react"
import moment from 'moment-hijri'

export default function Header() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [accessiblePages, setAccessiblePages] = useState<string[]>([])

  useEffect(() => {
    const fetchAccessiblePages = async () => {
      const result = await checkAccess()
      setAccessiblePages(result.accessiblePages)
    }

    if (status === "authenticated") {
      fetchAccessiblePages()
    }
  }, [status])

  const navItems = useMemo(() => {
    const items = [
      // { name: "Pemesanan", href: "/qurban/pemesanan" }
    ]
    if (session?.user?.role !== Role.MEMBER) {
      items.push({ name: "Dashboard", href: "/dashboard" })
    }
    return items
  }, [session])

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <header className="fixed w-full z-50 bg-secondary/80 top-0 border-b backdrop-blur-sm border-green-100">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6">
        <div className="mr-8 flex items-center">
          <Link href="/qurban" className="flex items-center">
            <span className="text-xl font-bold text-green-600">Go Qurban {moment().iYear()} H</span>
          </Link>
        </div>

        <nav className="flex-1 flex items-center space-x-8 md:space-x-4 overflow-x-auto">
            <div className="hidden md:flex space-x-8">
              <Link href="#home" className="text-primary font-semibold uppercase hover:text-green-700 transition-colors">
                Home
              </Link>
              <Link href="#menu" className="text-primary font-semibold uppercase hover:text-green-700 transition-colors">
                Hewan
              </Link>
              <Link
                href="#testimoni"
                className="text-primary font-semibold uppercase hover:text-green-700 transition-colors"
              >
                Dalil
              </Link>
            </div>
            { status === "authenticated" && 
              <Link
                href={`qurban/konfirmasi/${session.user?.id}`}
                className="text-primary font-semibold uppercase hover:text-green-700 transition-colors"
              >
                Konfirmasi Pembayaran
              </Link>}
            {navItems.map((item) => {
              const slug = item.href.startsWith("/") ? item.href.slice(1) : item.href
              const isAccessible =
                status === "authenticated" &&
                (accessiblePages.includes(slug) || item.href === "/")

              return isAccessible ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "font-semibold uppercase hover:text-green-700 transition-colors whitespace-nowrap", // hover:text-primary
                    pathname === item.href
                      ? "text-foreground font-semibold"
                      : "text-primary"
                  )}
                >
                  {item.name}
                </Link>
              ) : null
            })}
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />

          {status === "authenticated" && session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.urlAvatar || undefined} alt={session.user.name || "User"} />
                    <AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Role: {session.user.role?.replace("_", " ")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/qurban/profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
