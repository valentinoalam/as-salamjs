'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { HewanQurban } from './columns';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { markAsSembelih, markAsCacah } from '@/app/dashboard/proses/actions';

interface ProsesActionsProps {
  hewan: HewanQurban;
}

export function ProsesActions({ hewan }: ProsesActionsProps) {
  const router = useRouter();
  const [showSembelihDialog, setShowSembelihDialog] = useState(false);
  const [showCacahDialog, setShowCacahDialog] = useState(false);
  const [packageCount, setPackageCount] = useState<number>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSembelih = async () => {
    try {
      setIsLoading(true);
      const result = await markAsSembelih(hewan.id);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      toast.success('Status hewan berhasil diubah menjadi Disembelih');
      router.refresh();
    } catch (error) {
      toast.error('Gagal mengubah status hewan');
      console.error(error);
    } finally {
      setIsLoading(false);
      setShowSembelihDialog(false);
    }
  };

  const handleCacah = async () => {
    try {
      setIsLoading(true);
      const result = await markAsCacah(hewan.id, packageCount);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      toast.success('Status hewan berhasil diubah menjadi Dicacah');
      router.refresh();
    } catch (error) {
      toast.error('Gagal mengubah status hewan');
      console.error(error);
    } finally {
      setIsLoading(false);
      setShowCacahDialog(false);
    }
  };

  const canBeSembelih = ['TIBA', 'SEHAT'].includes(hewan.status);
  const canBeCacah = hewan.status === 'DISEMBELIH';

  return (
    <>
      <div className="flex items-center gap-2">
        {canBeSembelih && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSembelihDialog(true)}
            disabled={isLoading}
          >
            Tandai Sembelih
          </Button>
        )}
        
        {canBeCacah && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCacahDialog(true)}
            disabled={isLoading}
          >
            Tandai Cacah
          </Button>
        )}
      </div>

      <AlertDialog open={showSembelihDialog} onOpenChange={setShowSembelihDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penyembelihan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menandai hewan {hewan.animalId} sebagai sudah disembelih?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSembelih}
              disabled={isLoading}
            >
              {isLoading ? 'Memproses...' : 'Ya, Tandai Sembelih'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCacahDialog} onOpenChange={setShowCacahDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai Hewan Dicacah</DialogTitle>
            <DialogDescription>
              Masukkan jumlah paket daging yang dihasilkan dari hewan {hewan.animalId}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="packageCount">Jumlah Paket</Label>
              <Input
                id="packageCount"
                type="number"
                value={packageCount}
                onChange={(e) => setPackageCount(parseInt(e.target.value))}
                placeholder="Masukkan jumlah paket"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCacahDialog(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleCacah}
              disabled={isLoading || !packageCount}
            >
              {isLoading ? 'Memproses...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}