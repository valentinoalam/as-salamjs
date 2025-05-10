import { Header } from '@/components/dashboard/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/app-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

    <SidebarProvider className="flex w-auto h-screen overflow-hidden relative">
      <AppSidebar className='flex-none' variant='sidebar' collapsible='offcanvas' />
      {/* <aside className="hidden w-64 border-r md:block">
        <AppSidebar />
      </aside> */}
      <div className="flex-1 grow flex flex-col min-w-0 relative">
        <Header />
        <main className="flex flex-1 flex-col overflow-auto gap-4 p-4">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}