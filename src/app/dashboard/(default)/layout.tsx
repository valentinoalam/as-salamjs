import { UIStateProvider } from '@/contexts/ui-state-context';
import { SocketProvider } from '@/contexts/socket-context';
import { QurbanProvider } from '@/contexts/qurban-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIStateProvider>
      <SocketProvider>
        <QurbanProvider>
          {children}
        </QurbanProvider>
      </SocketProvider>
    </UIStateProvider>
  );
}