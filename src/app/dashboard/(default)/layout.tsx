import { SocketProvider } from '@/contexts/socket-context';
import { QurbanProvider } from '@/contexts/qurban-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketProvider>
      <QurbanProvider>
        {children}
      </QurbanProvider>
    </SocketProvider>
  );
}