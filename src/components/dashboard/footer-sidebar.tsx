'use client'
import React from 'react'
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { Button } from "../ui/button"
import { SidebarFooter, SidebarMenu, SidebarMenuItem } from '../ui/sidebar'


const FooterSidebar = () => {
  return (
    <SidebarFooter>
      <Button variant='outline' 
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Keluar</span>
      </Button>
		</SidebarFooter>
  )
}

export default FooterSidebar
