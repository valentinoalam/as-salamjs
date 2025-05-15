"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { addProductLog } from "./actions"
import { Counter, type jenisProduk } from "@prisma/client"
import { Download, AlertCircle, CheckCircle } from "lucide-react"
import { exportToExcel } from "@/lib/excel"

type ProdukHewan = {
  id: number
  nama: string
  tipeId: number | null
  berat: number | null
  targetPaket: number
  pkgOrigin: number
  pkgReceived: number
  pkgDelivered: number
  jenisProduk: jenisProduk
  tipe_hewan: {
    id: number
    nama: string
    icon: string | null
  } | null
}

interface CounterTimbangProps {
  initialProdukDaging: ProdukHewan[]
  allProducts: ProdukHewan[]
}

interface HistoryItem {
  text: string
  time: string
  type: 'add' | 'decrease'
}

interface ErrorLog {
  product: string
  error: string
  time: string
}

const MAX_HISTORY_ITEMS = 20
const MAX_ERROR_LOGS = 20

export default function CounterTimbang({ initialProdukDaging, allProducts }: CounterTimbangProps) {
  const [produkDaging, setProdukDaging] = useState<ProdukHewan[]>(initialProdukDaging)
  const [allProdukHewan, setAllProdukHewan] = useState<ProdukHewan[]>(allProducts)
  const [selectedProduct, setSelectedProduct] = useState<number>(initialProdukDaging[0]?.id || 0)
  const [quantity, setQuantity] = useState<number>(1)
  const [counters, setCounters] = useState<Record<number, number>>({})
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { socket, isConnected } = useSocket()

  // Initialize counters
  useEffect(() => {
    const initialCounters: Record<number, number> = {}
    produkDaging.forEach((product) => {
      initialCounters[product.id] = 0
    })
    setCounters(initialCounters)
  }, [produkDaging])

  // Socket event handlers
  useEffect(() => {
    if (!socket) return

    const handleUpdateProduct = (data: { products: ProdukHewan[] }) => {
      const updateProducts = (prev: ProdukHewan[]) =>
        prev.map((item) => {
          const updated = data.products.find((p) => p.id === item.id)
          return updated ? { ...item, ...updated } : item
        })

      setProdukDaging(updateProducts)
      setAllProdukHewan(updateProducts)
    }

    const handleErrorLog = (data: { product: string; error: string }) => {
      const currentTime = new Date().toLocaleTimeString()
      setErrorLogs((prev) => [
        { product: data.product, error: data.error, time: currentTime },
        ...prev.slice(0, MAX_ERROR_LOGS - 1)
      ])
    }

    socket.on("update-product", handleUpdateProduct)
    socket.on("error-log", handleErrorLog)

    return () => {
      socket.off("update-product", handleUpdateProduct)
      socket.off("error-log", handleErrorLog)
    }
  }, [socket])

  // Memoized product lookup
  const productMap = useMemo(() => {
    const map = new Map<number, ProdukHewan>()
    allProdukHewan.forEach(product => map.set(product.id, product))
    return map
  }, [allProdukHewan])

  const getProductName = useCallback((id: number): string => {
    const product = productMap.get(id)
    return product ? product.nama : "Unknown Product"
  }, [productMap])

  const getProductDetails = useCallback((id: number): string => {
    const product = productMap.get(id)
    return product ? `${product.nama} (${product.tipe_hewan?.nama || 'No Type'})` : "Unknown Product"
  }, [productMap])

  const handleAddQuantity = useCallback((value: number) => {
    setQuantity((prev) => prev + value)
  }, [])

  const handleSetQuantity = useCallback((value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 0) {
      setQuantity(numValue)
    }
  }, [])

  const addToHistory = useCallback((text: string, type: 'add' | 'decrease') => {
    const currentTime = new Date().toLocaleTimeString()
    setHistory((prev) => [
      { text, time: currentTime, type },
      ...prev.slice(0, MAX_HISTORY_ITEMS - 1)
    ])
  }, [])

  const handleSubmit = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a product and enter a valid quantity.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      // Update local counter
      setCounters((prev) => ({
        ...prev,
        [selectedProduct]: prev[selectedProduct] + quantity,
      }))

      // Add to history
      addToHistory(`🔵➕ ${quantity} to ${getProductDetails(selectedProduct)}`, 'add')

      // Send to server
      await addProductLog(selectedProduct, "add", Counter.PENYEMBELIHAN, quantity, "Added from counter timbang")

      // Emit socket event
      if (socket && isConnected) {
        socket.emit("update-product", {
          productId: selectedProduct,
          operation: "add",
          place: Counter.PENYEMBELIHAN,
          value: quantity,
        })
      }

      // Reset quantity
      setQuantity(1)
      
      toast({
        title: "Success",
        description: `Added ${quantity} items to ${getProductName(selectedProduct)}`,
      })
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecreaseProduct = async (id: number) => {
    const currentCount = counters[id] || 0
    if (currentCount <= 0) return

    try {
      // Update local counter
      setCounters((prev) => ({
        ...prev,
        [id]: Math.max(0, prev[id] - 1),
      }))

      // Add to history
      addToHistory(`🔴➖ 1 from ${getProductDetails(id)}`, 'decrease')

      // Send to server
      await addProductLog(id, "subtract", Counter.PENYEMBELIHAN, 1, "Decreased from counter timbang")

      // Emit socket event
      if (socket && isConnected) {
        socket.emit("update-product", {
          productId: id,
          operation: "subtract",
          place: Counter.PENYEMBELIHAN,
          value: 1,
        })
      }
    } catch (error) {
      console.error("Error decreasing product:", error)
      toast({
        title: "Error",
        description: "Failed to decrease product. Please try again.",
        variant: "destructive",
      })
      
      // Revert the local counter on error
      setCounters((prev) => ({
        ...prev,
        [id]: prev[id] + 1,
      }))
    }
  }

  const handleExportToExcel = () => {
    const data = allProdukHewan.map((product) => ({
      ID: product.id,
      Nama: product.nama,
      Tipe: product.tipe_hewan?.nama || "-",
      Jenis: product.jenisProduk,
      Berat: product.berat || 0,
      "Target Paket": product.targetPaket,
      "Paket Asal": product.pkgOrigin,
      "Paket Diterima": product.pkgReceived,
      "Paket Didistribusi": product.pkgDelivered,
      "Counter Saat Ini": counters[product.id] || 0,
    }))

    exportToExcel(data, `counter_timbang_${new Date().toISOString().split('T')[0]}`)
  }

  const hasErrors = errorLogs.length > 0

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-sm font-medium">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Product Selection and Quantity */}
      <Card>
        <CardHeader>
          <CardTitle>Select Product and Quantity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Product</h3>
              <RadioGroup
                value={selectedProduct.toString()}
                onValueChange={(value) => setSelectedProduct(parseInt(value, 10))}
                className="space-y-3"
              >
                {produkDaging.map((product) => (
                  <div key={product.id} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={product.id.toString()} 
                      id={`product-${product.id}`}
                      disabled={isSubmitting}
                    />
                    <Label 
                      htmlFor={`product-${product.id}`} 
                      className="cursor-pointer flex-1"
                    >
                      <span className="font-medium">{product.nama}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({product.tipe_hewan?.nama || 'No Type'})
                      </span>
                    </Label>
                    <span className="text-sm text-gray-500">
                      Current: {counters[product.id] || 0}
                    </span>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Quantity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleSetQuantity(e.target.value)}
                    min={1}
                    className="w-24"
                    disabled={isSubmitting}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => handleAddQuantity(1)}
                    disabled={isSubmitting}
                  >
                    +1
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleAddQuantity(5)}
                    disabled={isSubmitting}
                  >
                    +5
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleAddQuantity(10)}
                    disabled={isSubmitting}
                  >
                    +10
                  </Button>
                </div>
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleExportToExcel} 
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Weight Display */}
      <Card>
        <CardHeader>
          <CardTitle>Komulatif Timbang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allProdukHewan.map((product) => {
              const progress = (product.pkgOrigin / product.targetPaket) * 100
              const isCompleted = progress >= 100
              
              return (
                <div 
                  key={product.id} 
                  className={`flex flex-col items-center p-4 border rounded-lg ${
                    isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <span className="text-sm font-medium mb-2">{product.nama}</span>
                  <span className="text-2xl font-bold">{product.pkgOrigin}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    Target: {product.targetPaket}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs mt-1">
                    {Math.round(progress)}%
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Your Counter */}
      <Card>
        <CardHeader>
          <CardTitle>Your Counter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produkDaging.map((product) => {
              const count = counters[product.id] || 0
              
              return (
                <div key={product.id} className="flex flex-col items-center p-4 border rounded-lg">
                  <span className="text-sm font-medium mb-2">{product.nama}</span>
                  <span className="text-2xl font-bold">{count}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecreaseProduct(product.id)}
                    className="mt-2"
                    disabled={count <= 0}
                  >
                    Minus
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History Penambahan</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No history yet</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((item, index) => (
                <li 
                  key={index} 
                  className={`text-sm flex items-center gap-2 ${
                    item.type === 'add' ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  <span>{item.text}</span>
                  <span className="text-gray-400 text-xs">({item.time})</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Error Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Error Log</CardTitle>
          {hasErrors && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          {errorLogs.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>No errors logged</span>
            </div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {errorLogs.map((item, index) => (
                <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium">{item.product}:</span> {item.error}
                    <span className="text-xs text-gray-500 ml-2">({item.time})</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}