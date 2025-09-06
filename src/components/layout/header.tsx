"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "#@/lib/utils/utils.ts"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { useMemo } from "react"
import { Role } from "@prisma/client"
import { signOut } from "next-auth/react"
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
import { LogOut, UserIcon } from "lucide-react"
import moment from 'moment-hijri'
import { useAuthStore } from "@/hooks/qurban/use-stores"

export default function Header() {
  const pathname = usePathname()
  const { user,isAuthenticated, accessiblePages } = useAuthStore()

  const navItems = useMemo(() => {
    const items = [
      // { name: "Pemesanan", href: "/qurban/pemesanan" }
    ]
    const isMember = user?.roles?.some(role => role === Role.MEMBER);

    if (!isMember) { // If the user is NOT a member
      items.push({ name: "Dashboard", href: "/dashboard" });
    }
    return items
  }, [user])

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
            { pathname === "/qurban" && (
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
            </div>)}
            { isAuthenticated && 
              <Link
                href={`qurban/konfirmasi/${user?.id}`}
                className="text-primary font-semibold uppercase hover:text-green-700 transition-colors"
              >
                Konfirmasi Pembayaran
              </Link>}
            {navItems.map((item) => {
              const slug = item.href.startsWith("/") ? item.href.slice(1) : item.href
              const isAccessible =
                isAuthenticated &&
                (accessiblePages.includes(slug) || item.href === "/")

              return isAccessible ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "font-semibold uppercase hover:text-green-700 transition-colors whitespace-nowrap",
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

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!user.roles.includes("USER") && <DropdownMenuItem>
                  <span>
                    Role:{" "}
                    {user.roles
                      ?.map((role) => role.replace("_", " "))
                      .join(", ")}
                  </span>
                </DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" /><Link href="/qurban/profile">Profile Page</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/register">Register</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}