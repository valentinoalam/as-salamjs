'use client'
import { EventSwitcher } from "./event-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import moment from 'moment-hijri'
import FooterSidebar from "./footer-sidebar"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"

const data = {
  event: ["Itikaf", "Qurban"],
  navMain: [
    {
      title: "Manajemen",
      url: "#",
      items: [
        {
          title: "Keuangan",
          url: "/dashboard/keuangan",
        },
        {
          title: "Transaksi Lainnya",
          url: "/dashboard/transactions",
        },
        {
          title: "Pengqurban",
          url: "/dashboard/mudhohi",
        },
        {
          title: "Distribusi",
          url: "/dashboard/distribusi",
        },
        {
          title: "Panitia",
          url: "/dashboard/panitia",
        },
      ],
    },
    {
      title: "Pencatatan hari H",
      url: "#",
      items: [
        {
          title: "Progres Sembelih",
          url: "/dashboard/progres-sembelih",
        },
        {
          title: "Counter Timbang",
          url: "/dashboard/counter-timbang",
        },
        {
          title: "Counter Inventori",
          url: "/dashboard/counter-inventori",
          // icon: Package,
          // role: ["ADMIN", "USER"],
        },
        {
          title: "Counter Pengambilan",
          url: "/counter-pengambilan",
          // icon: UserCheck,
          // role: ["ADMIN", "USER"],
        },
        {
          title: "Counter Distribusi",
          url: "/counter-distribusi",
          // icon: Ticket,
          // role: ["ADMIN", "USER"],
        },
      ],
    },
    {
      title: "Pengaturan",
      url: "/dashboard/pengaturan",
    },
  ],
}

const getDefaultEvent = () => {
  const currentHijriMonth = moment().iMonth() // Mendapatkan bulan Hijriyah saat ini (0-based index)
  
  // Jika bulan sebelum Zulkaidah (bulan ke-11), gunakan index 0 (Itikaf)
  // Zulkaidah = bulan ke-10 (karena index 0-based)
  return currentHijriMonth < 10 ? data.event[0] : data.event[1]
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { accessiblePages } = useAuthStore()

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <EventSwitcher
          events={data.event}
          defaultEvent={getDefaultEvent()}
        />
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => {
          // Check accessibility for top-level items
          const topLevelSlug = item.url ? (item.url.startsWith("/") ? item.url.slice(1) : item.url) : ""
          const isTopLevelAccessible = 
            (accessiblePages.includes(topLevelSlug) || item.url === "/")

          if (item.items) {
            // For groups with sub-items, filter accessible sub-items
            const accessibleItems = item.items.filter((subItem) => {
              const slug = subItem?.url.startsWith("/dashboard/") ? subItem.url.slice(1) : subItem.url
              const isAccessible =
                (accessiblePages.includes(slug) || subItem.url === "/")
              return isAccessible
            })

            // Only render the group if there are accessible items
            return accessibleItems.length > 0 ? (
              <SidebarGroup key={item.title}>
                <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {accessibleItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                          <a href={item.url}>{item.title}</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null
          } else {
            // For single items, check accessibility
            return isTopLevelAccessible ? (
              <SidebarMenu key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url}>
                  <a href={item.url}>{item.title}</a>
                </SidebarMenuButton>
              </SidebarMenu>
            ) : null
          }
        })}
      </SidebarContent>
      <SidebarRail />
      <FooterSidebar />
    </Sidebar>
  )
}