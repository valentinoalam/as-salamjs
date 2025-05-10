'use client'
import { Fragment } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb';
import { Separator } from '../ui/separator';
import { SidebarTrigger } from '../ui/sidebar';
import { UserNav } from './user-nav';
import { ModeToggle } from '@/components/ui/mode-toggle';
import usePathInfo from '@/hooks/use-pathinfo';

interface BreadcrumbItem {
  name: string
  href: string
}
function generateBreadcrumbs(pathname: string | null): BreadcrumbItem[] {
  if (!pathname) return []

  // Split path into segments and filter out empty segments
  const pathSegments = pathname.split('/').filter(segment => segment !== '')

  // Create cumulative paths for each segment
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    return {
      name: formatSegmentName(segment),
      href: href
    }
  })

  // Always add home as first item
  return [{ name: 'Home', href: '/' }, ...breadcrumbs]
}

function formatSegmentName(segment: string): string {
  return segment
    .split('-') // Split kebab-case
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
    .join(' ')
}
export function Header() {
  const { segments } = usePathInfo()
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 border-border justify-between bg-card">
      <div className='flex items-center'>
        <SidebarTrigger className="-ml-1 h-4" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {/* Always show Dashboard on desktop */}
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1
              const href = `/${segments.slice(0, index + 1).join('/')}`
              
              return (
                <Fragment key={href}>
                  <BreadcrumbItem 
                    className={!isLast ? 'hidden md:block' : ''}
                    key={href}
                  >
                    {!isLast ? (
                      <BreadcrumbLink href={href}>
                        {formatSegmentName(segment)}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-3xl font-bold tracking-tight">
                        {formatSegmentName(segment)}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="flex h-16 items-center justify-between px-6">
        <div></div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}