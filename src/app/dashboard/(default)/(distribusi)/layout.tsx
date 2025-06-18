import { DistribusiProvider } from '@/contexts/distribusi-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DistribusiProvider>
      {children}
    </DistribusiProvider>
  );
}