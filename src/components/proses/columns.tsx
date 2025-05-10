'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProsesActions } from './proses-actions';
import { formatDateTime } from '@/lib/utils';

export type HewanQurban = {
  id: string;
  animalId: string;
  type: 'KAMBING' | 'DOMBA' | 'SAPI';
  status: 'TERSEDIA' | 'DIPESAN' | 'TIBA' | 'SEHAT' | 'SAKIT' | 'DISEMBELIH' | 'DICACAH' | 'DIDISTRIBUSIKAN';
  estimatedWeight?: number | null;
  slaughteredAt?: Date | null;
  processedAt?: Date | null;
  meatPackageCount?: number | null;
  qurbanTransactions: Array<{
    pekurban: {
      name: string;
    };
  }>;
};

const statusLabels: Record<string, string> = {
  'TERSEDIA': 'Tersedia',
  'DIPESAN': 'Dipesan',
  'TIBA': 'Tiba',
  'SEHAT': 'Sehat',
  'SAKIT': 'Sakit',
  'DISEMBELIH': 'Disembelih',
  'DICACAH': 'Dicacah',
  'DIDISTRIBUSIKAN': 'Didistribusikan',
};

const statusVariants: Record<string, string> = {
  'TERSEDIA': 'outline',
  'DIPESAN': 'secondary',
  'TIBA': 'default',
  'SEHAT': 'success',
  'SAKIT': 'destructive',
  'DISEMBELIH': 'warning',
  'DICACAH': 'success',
  'DIDISTRIBUSIKAN': 'success',
};

export const ProsesColumns: ColumnDef<HewanQurban>[] = [
  {
    accessorKey: 'animalId',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ID Hewan
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'type',
    header: 'Jenis',
    cell: ({ row }) => {
      const type = row.getValue('type') as string;
      return type === 'KAMBING' ? 'Kambing' : type === 'DOMBA' ? 'Domba' : 'Sapi';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={statusVariants[status] as any}>
          {statusLabels[status]}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'qurbanTransactions',
    header: 'Pekurban',
    cell: ({ row }) => {
      const transactions = row.original.qurbanTransactions;
      if (!transactions.length) return '-';
      return transactions.map(t => t.pekurban.name).join(', ');
    },
  },
  {
    accessorKey: 'slaughteredAt',
    header: 'Waktu Sembelih',
    cell: ({ row }) => {
      const date = row.original.slaughteredAt;
      return date ? formatDateTime(date) : '-';
    },
  },
  {
    accessorKey: 'processedAt',
    header: 'Waktu Cacah',
    cell: ({ row }) => {
      const date = row.original.processedAt;
      return date ? formatDateTime(date) : '-';
    },
  },
  {
    accessorKey: 'meatPackageCount',
    header: 'Jumlah Paket',
    cell: ({ row }) => {
      const count = row.original.meatPackageCount;
      return count ?? '-';
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ProsesActions hewan={row.original} />,
  },
];