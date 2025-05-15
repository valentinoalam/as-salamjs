import { signOut, useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';

export function UserNav() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const initials = session.user.name
    ? session.user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabels: Record<string, string> = {
    'ADMIN': 'Administrator',
    'PETUGAS_PENDAFTARAN': 'Panitia Pendaftaran',
    'PETUGAS_KEUANGAN': 'Panitia Keuangan',
    'PETUGAS_PENYEMBELIHAN': 'Panitia Lapangan',
    'PETUGAS_INVENTORY': 'Panitia Distribusi',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground mt-1">
              {roleLabels[session.user.role as string] || session.user.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">
            <User className="mr-2 h-4 w-4" />
            <span>Profil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/pengaturan">
            <Settings className="mr-2 h-4 w-4" />
            <span>Pengaturan</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}