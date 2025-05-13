"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/lib/socket"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { addProductLog } from "./actions"
import { Counter, type jenisProduk } from "@prisma/client"
import { Download } from "lucide-react"
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

export default function CounterTimbang({ initialProdukDaging, allProducts }: CounterTimbangProps) {
  const [produkDaging, setProdukDaging] = useState<ProdukHewan[]>(initialProdukDaging)
  const [allProdukHewan, setAllProdukHewan] = useState<ProdukHewan[]>(allProducts)
  const [selectedProduct, setSelectedProduct] = useState<number>(initialProdukDaging[0]?.id || 0)
  const [quantity, setQuantity] = useState<number>(1)
  const [counters, setCounters] = useState<Record<number, number>>({})
  const [history, setHistory] = useState<Array<{ text: string; time: string }>>([])
  const [errorLogs, setErrorLogs] = useState<Array<{ product: string; error: string; time: string }>>([])
  const { socket, isConnected } = useSocket()

  // Initialize counters
  useEffect(() => {
    const initialCounters: Record<number, number> = {}
    initialProdukDaging.forEach((product) => {
      initialCounters[product.id] = 0
    })
    setCounters(initialCounters)
  }, [initialProdukDaging])

  useEffect(() => {
    if (!socket) return

    const handleUpdateProduct = (data: { products: ProdukHewan[] }) => {
      setProdukDaging((prev) =>
        prev.map((item) => {
          const updated = data.products.find((p) => p.id === item.id)
          return updated ? { ...item, ...updated } : item
        }),
      )

      setAllProdukHewan((prev) =>
        prev.map((item) => {
          const updated = data.products.find((p) => p.id === item.id)
          return updated ? { ...item, ...updated } : item
        }),
      )
    }

    const handleErrorLog = (data: { product: string; error: string }) => {
      const currentTime = new Date().toLocaleTimeString()
      setErrorLogs((prev) => [{ product: data.product, error: data.error, time: currentTime }, ...prev.slice(0, 19)])
    }

    socket.on("update-product", handleUpdateProduct)
    socket.on("error-log", handleErrorLog)

    return () => {
      socket.off("update-product", handleUpdateProduct)
      socket.off("error-log", handleErrorLog)
    }
  }, [socket])

  const getProductName = (id: number) => {
    const product = allProdukHewan.find((p) => p.id === id)
    return product ? product.nama : "Unknown Product"
  }

  const handleAddQuantity = (value: number) => {
    setQuantity((prev) => prev + value)
  }

  const handleSetQuantity = (value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setQuantity(numValue)
    }
  }

  const handleSubmit = async () => {
    if (!selectedProduct || quantity <= 0) return

    try {
      // Update local counter
      setCounters((prev) => ({
        ...prev,
        [selectedProduct]: prev[selectedProduct] + quantity,
      }))

      // Add to history
      const currentTime = new Date().toLocaleTimeString()
      setHistory((prev) => [
        {
          text: `🔵➕ ${quantity} to ${getProductName(selectedProduct)}`,
          time: currentTime,
        },
        ...prev.slice(0, 19), // Keep only last 20 items
      ])

      // Send to server
      await addProductLog(selectedProduct, "add", Counter.PENYEMBELIHAN, quantity, "Added from counter timbang")

      // Emit socket event if needed
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
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDecreaseProduct = async (id: number) => {
    try {
      // Update local counter
      setCounters((prev) => ({
        ...prev,
        [id]: Math.max(0, prev[id] - 1),
      }))

      // Add to history
      const currentTime = new Date().toLocaleTimeString()
      setHistory((prev) => [
        {
          text: `🔴➖ 1 from ${getProductName(id)}`,
          time: currentTime,
        },
        ...prev.slice(0, 19), // Keep only last 20 items
      ])

      // Send to server
      await addProductLog(id, "decrease", Counter.PENYEMBELIHAN, 1, "Decreased from counter timbang")

      // Emit socket event if needed
      if (socket && isConnected) {
        socket.emit("update-product", {
          productId: id,
          operation: "decrease",
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
    }))

    exportToExcel(data, "counter_timbang_data")
  }
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Weight and Quantity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Product</h3>
              <RadioGroup
                value={selectedProduct.toString()}
                onValueChange={(value) => setSelectedProduct(Number.parseInt(value))}
                className="space-y-2"
              >
                {produkDaging.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={product.id.toString()} id={`product-${product.id}`} />
                    <Label htmlFor={`product-${product.id}`} className="cursor-pointer">
                      {product.nama} ({product.tipe_hewan?.nama})
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Quantity</h3>
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleSetQuantity(e.target.value)}
                  min={1}
                  className="w-24"
                />
                <Button variant="outline" onClick={() => handleAddQuantity(1)}>
                  +1
                </Button>
                <Button variant="outline" onClick={() => handleAddQuantity(5)}>
                  +5
                </Button>
                <Button variant="outline" onClick={() => handleAddQuantity(10)}>
                  +10
                </Button>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                Submit
              </Button>
            </div>
            <Button variant="outline" onClick={handleExportToExcel} className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Komulatif Timbang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allProdukHewan.map((product) => (
              <div key={product.id} className="flex flex-col items-center p-4 border rounded-md">
                <span className="text-lg mb-2">{product.nama}</span>
                <span className="text-3xl font-bold">{product.pkgOrigin}</span>
                <div className="text-xs mt-1">Target: {product.targetPaket}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Counter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {produkDaging.map((product) => (
              <div key={product.id} className="flex flex-col items-center p-4 border rounded-md">
                <span className="text-lg mb-2">{product.nama}</span>
                <span className="text-3xl font-bold">{counters[product.id] || 0}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecreaseProduct(product.id)}
                  className="mt-2"
                  disabled={(counters[product.id] || 0) <= 0}
                >
                  Minus
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History Penambahan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {history.map((item, index) => (
              <li key={index} className="text-sm">
                {item.text} ({item.time})
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Log</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {errorLogs.map((item, index) => (
              <li key={index} className="text-sm text-red-500">
                {item.product}: {item.error} ({item.time})
              </li>
            ))}
            {errorLogs.length === 0 && <li className="text-sm">No errors logged</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
