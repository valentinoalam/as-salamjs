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
          title: "Pengqurban",
          url: "/dashboard/mudhohi",
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
        },
      ],
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
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <EventSwitcher
          events={data.event}
          defaultEvent={getDefaultEvent()}
        />
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
      <FooterSidebar />
    </Sidebar>
  )
}