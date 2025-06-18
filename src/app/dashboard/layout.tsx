import { Header } from '@/components/dashboard/header';
import { UIStateProvider } from '@/contexts/ui-state-context';
import { AppSidebar } from '@/components/dashboard/app-sidebar';

import { Providers } from './providers';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const session = await getServerSession(authOptions);
  
  // // Redirect logged-in users based on role
  // if (session?.user.role === "ADMIN") redirect("/admin/dashboard");
  // if (session?.user.role === "MEMBER") redirect("/dashboard");
  return (
    <UIStateProvider>
      <Providers>
        <AppSidebar className='flex-none' variant='sidebar' collapsible='offcanvas' />
        <div className="flex-1 grow flex flex-col min-w-0 relative">
          <Header />
          <main className="flex flex-1 flex-col overflow-auto gap-4 md:p-4">
            {children}
          </main>
        </div>
      </Providers>
    </UIStateProvider>
  );
}