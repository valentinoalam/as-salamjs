'use client'
import { usePathname } from 'next/navigation'

export default function usePathInfo() {
  const pathname = usePathname()
  
  // Get path segments
  const segments = pathname?.split('/').filter(Boolean) || []
  
  // Extract parent path (returns null if at root)
  const parentPath = segments.length > 1 
    ? `/${segments.slice(0, -1).join('/')}` 
    : ''

  // Get current page name (last segment)
  const pageName = segments.length > 0 
    ? segments[segments.length - 1] 
    : 'home' // default for root

  // Optional: Format page name (e.g., "my-page" → "My Page")
  const formattedPageName = pageName
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return {
    pathname,
    parentPath,
    segments,
    pageName,
    formattedPageName
  }
}