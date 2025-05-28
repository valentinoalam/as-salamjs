import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { QurbanSalesStats } from'@/types/keuangan';

function QurbanSalesReport({stats}: {stats: QurbanSalesStats}) {
  return (
    <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.perTipeHewan.map((tipe: { tipeHewanId: number; nama: string; count: number; totalAmount: any; }) => (
          <div key={tipe.tipeHewanId} className="p-4 border rounded-lg">
          <div className="flex justify-between items-center">
              <h3 className="font-medium">{tipe.nama}</h3>
              <Badge variant="outline">{tipe.count} Ekor</Badge>
          </div>
          <div className="mt-2 text-2xl font-bold">
              {formatCurrency(tipe.totalAmount)}
          </div>
          <Progress 
              value={(tipe.count / stats.totalCount) * 100} 
              className="mt-2 h-2"
          />
          </div>
        ))}
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
                <h3 className="font-medium">Total dari {stats.totalCount} Pengqurban</h3>
                <Badge variant="outline"> {stats.animalCount} Hewan</Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">
                {formatCurrency(stats.totalSales)}
            </div>
          </div>
        </div>
    </div>
  )
}

export default QurbanSalesReport