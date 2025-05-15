"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { useEffect, useState } from "react"
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

  const navItems = [
    { name: "Dashboard", href: "/" },
    { name: "Pemesanan", href: "/pemesanan" },
    { name: "Pengqurban", href: "/mudhohi" },
    { name: "Progres Sembelih", href: "/progres-sembelih" },
    { name: "Counter Timbang", href: "/counter-timbang" },
    { name: "Counter Inventori", href: "/counter-inventori" },
    { name: "Keuangan", href: "/keuangan" },
  ]

  // Add Panitia page for admin
  if (session?.user?.role === Role.ADMIN) {
    navItems.push({ name: "Panitia", href: "/panitia" })
  }

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
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6">
        <div className="mr-8 flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">Qurban 1446 H</span>
          </Link>
        </div>
        <nav className="flex-1 flex items-center space-x-1 md:space-x-4 overflow-x-auto">
          {navItems.map((item) => {
            const isAccessible =
              status !== "authenticated" || accessiblePages.includes(item.href.replace("/", "")) || item.href === "/"

            return isAccessible ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
                  pathname === item.href ? "text-foreground font-semibold" : "text-muted-foreground",
                )}
              >
                {item.name}
              </Link>
            ) : null
          })}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />

          {status === "authenticated" && session.user ? (
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
                  <Link href="/profile">Profile Settings</Link>
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
