import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { format } from 'date-fns'
import { Info, Clock, Wallet, CheckCircle, XCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/formatters'

export interface TransactionDetail {
  id: string
  nama_pengqurban: string | null
  createdAt: Date
  totalAmount: number
  hewanTypes: Array<{
    nama: string
    harga: number
    count: number
  }>
  paymentStatus: string
}
export function TransactionList({ transactions }: { transactions: TransactionDetail[] }) {
  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const dateKey = format(transaction.createdAt, 'yyyy-MM-dd')
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: transaction.createdAt,
        mudhohis: new Set<string>(),
        totalAmount: 0,
        hewanTypes: new Map<string, number>(),
        transactions: []
      }
    }
    
    const group = acc[dateKey]
    if (transaction.nama_pengqurban) {
      group.mudhohis.add(transaction.nama_pengqurban)
    }
    
    group.totalAmount += transaction.totalAmount
    transaction.hewanTypes.forEach(hewan => {
      const count = group.hewanTypes.get(hewan.nama) || 0
      group.hewanTypes.set(hewan.nama, count + hewan.count)
    })
    
    group.transactions.push(transaction)
    return acc
  }, {} as Record<string, {
    date: Date
    mudhohis: Set<string>
    totalAmount: number
    hewanTypes: Map<string, number>
    transactions: TransactionDetail[]
  }>)

  // Sort dates descending and transactions within date descending
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  const getStatusDetails = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return { text: 'Lunas', color: 'text-green-600', icon: CheckCircle }
      case 'pending':
        return { text: 'Menunggu Pembayaran', color: 'text-yellow-600', icon: Clock }
      default:
        return { text: 'Dibatalkan', color: 'text-red-600', icon: XCircle }
    }
  }

  return (
<Card>
      <CardHeader>
        <CardTitle>Daftar Transaksi</CardTitle>
        <CardDescription>
          Klik atau arahkan kursor ke badge pengqurban untuk melihat detail transaksi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const group = groupedTransactions[dateKey]
            
            return (
              <div key={dateKey} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-8">
                  <h3 className="text-lg font-semibold">
                    {formatDate(group.date)}:
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {group.transactions.length} transaksi
                  </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Total nilai:
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(group.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Pengqurban Badges */}
                <div className="flex flex-wrap gap-2">
                  {group.transactions.map((transaction) => {
                    const status = getStatusDetails(transaction.paymentStatus)
                    const StatusIcon = status.icon
                    
                    return (
                      <HoverCard key={transaction.id}>
                        <HoverCardTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "cursor-pointer hover:shadow-md transition-all duration-200",
                              status.color
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="max-w-[120px] truncate">
                                {transaction.nama_pengqurban || 'Anonim'}
                              </span>
                              <StatusIcon className="h-4 w-4" />
                            </div>
                          </Badge>
                        </HoverCardTrigger>

                        <HoverCardContent className="w-80">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">
                                {transaction.nama_pengqurban || 'Anonim'}
                              </h4>
                              <Badge 
                                variant={transaction.paymentStatus.toLowerCase() === 'paid' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {status.text}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Wallet className="h-4 w-4" />
                                <span>Total:</span>
                              </div>
                              <div className="text-right font-medium">
                                {formatCurrency(transaction.totalAmount)}
                              </div>

                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Waktu:</span>
                              </div>
                              <div className="text-right">
                                {format(transaction.createdAt, 'HH:mm')}
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Detail Hewan:
                              </h5>
                              <div className="space-y-2">
                                {transaction.hewanTypes.map((hewan, index) => (
                                  <div key={index} className="flex justify-between items-center text-sm bg-muted/30 p-2 rounded">
                                    <div>
                                      <span className="font-medium">{hewan.nama}</span>
                                      <span className="text-muted-foreground ml-2">
                                        × {hewan.count}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">
                                        {formatCurrency(hewan.harga * hewan.count)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatCurrency(hewan.harga)}/ekor
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}