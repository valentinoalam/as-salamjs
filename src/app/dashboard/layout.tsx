import { Header } from '@/components/dashboard/header';
import { AppSidebar } from '@/components/dashboard/app-sidebar';

import { Providers } from './providers';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
      <Providers>
        <AppSidebar className='flex-none' variant='sidebar' collapsible='offcanvas' />
        <div className="flex-1 grow flex flex-col min-w-0 relative">
          <Header />
          <main className="flex flex-1 flex-col overflow-auto gap-4 md:p-4">
            {children}
          </main>
        </div>
      </Providers>
  );
}