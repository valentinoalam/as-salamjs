'use client'
import { Fragment, useEffect, useState } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { SidebarTrigger } from '../ui/sidebar';
import { UserNav } from './user-nav';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Maximize, Minimize } from 'lucide-react';
import usePathInfo from '@/hooks/use-pathinfo';

interface BreadcrumbItem {
  name: string
  href: string
}

function formatSegmentName(segment: string): string {
  return segment
    .split('-') // Split kebab-case
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
    .join(' ')
}

function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      className="h-8 w-8"
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <Minimize className="h-4 w-4" />
      ) : (
        <Maximize className="h-4 w-4" />
      )}
    </Button>
  );
}

export function Header() {
  const { segments } = usePathInfo()
  
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 border-border bg-card">
      {/* Left section - Navigation */}
      <div className='flex items-center flex-1'>
        <SidebarTrigger className="-ml-1 h-4" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1
              const href = `/${segments.slice(0, index + 1).join('/')}`
              
              return (
                <Fragment key={href}>
                  <BreadcrumbItem 
                    className={!isLast ? 'hidden md:block' : ''}
                  >
                    {!isLast ? (
                      <BreadcrumbLink href={href}>
                        {formatSegmentName(segment)}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
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
      
      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        <FullscreenToggle />
        <ModeToggle />
        <UserNav />
      </div>
    </header>
  );
}