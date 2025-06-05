"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Counter, JenisHewan } from "@prisma/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQurban } from "@/contexts/qurban-context"
import { ConnectionStatus } from "@/components/connection-status"
import { exportToExcel } from "@/lib/excel"
import { Download, Minus, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ProdukHewan, ShipmentProduct } from "@/types/qurban"

export default function CounterTimbangPage() {
  const { 
    productsQuery, 
    isConnected, 
    updateProduct, 
    createShipment,
    getProductsByType,
    getProductById,
    getProductLogsByPlace
  } = useQurban()
  const productLogs = getProductLogsByPlace(Counter.PENYEMBELIHAN)
  // Filter products for daging (meat) products
  const produkDaging = getProductsByType('daging')
  const allProdukHewan = getProductsByType('all')
  type GroupedProdukHewan = {
    [key in JenisHewan]?: ProdukHewan[];
  };

  const groupedProducts = allProdukHewan.reduce((acc: GroupedProdukHewan, product) => {
    if (product.tipe_hewan && product.tipe_hewan.jenis) {
      const jenisHewan = product.tipe_hewan.jenis;
      if (!acc[jenisHewan]) {
        acc[jenisHewan] = [];
      }
      acc[jenisHewan]?.push(product);
    }
    return acc;
  }, {});
  // const [note, setNote] = useState("")
  // const [operation, setOperation] = useState<"menambahkan" | "memindahkan" | "mengkoreksi">("menambahkan")
  const [showProductHistory, setShowProductHistory] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<number | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<number>(produkDaging[0]?.id || 0)
  const [quantity, setQuantity] = useState<number>(0)
  const [counters, setCounters] = useState<Record<number, number>>({})
  const [history, setHistory] = useState<Array<{ text: string; time: string }>>([])
  // Shipping state
  const [shipmentProducts, setShipmentProducts] = useState<ShipmentProduct[]>([])
  const [shipmentNote, setShipmentNote] = useState("")
  const [isCreatingShipment, setIsCreatingShipment] = useState(false)

  // Initialize counters when products load
  useEffect(() => {
    if (produkDaging.length > 0) {
      const initialCounters: Record<number, number> = {}
      produkDaging.forEach((product) => {
        initialCounters[product.id] = 0
      })
      setCounters(initialCounters)
      setSelectedProduct(produkDaging[0]?.id || 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update selected product when products change
  useEffect(() => {
    if (produkDaging.length > 0 && !selectedProduct) {
      setSelectedProduct(produkDaging[0].id)
    }
  }, [produkDaging, selectedProduct])

  const getProductName = (id: number) => {
    const product = getProductById(id)
    return product ? product.nama : "Unknown Product"
  }

  const handleAddQuantity = (value: number) => {
    setQuantity((prev) => prev + value)
  }

  const handleSetQuantity = (value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setQuantity(Math.max(1, numValue))
    }
  }

  const handleSubmit = async () => {
    if (!selectedProduct || quantity <= 0) return

    try {
      // Update local counter
      setCounters((prev) => ({
        ...prev,
        [selectedProduct]: (prev[selectedProduct] || 0) + quantity,
      }))

      // Add to history
      const currentTime = new Date().toLocaleTimeString()
      setHistory((prev) => [
        {
          text: `🔵➕ ${quantity} ${getProductName(selectedProduct)}`,
          time: currentTime,
        },
        ...prev.slice(0, 19), // Keep only last 20 items
      ])

      // Use context method to update product
      await updateProduct({
        productId: selectedProduct,
        operation: "menambahkan",
        place: Counter.PENYEMBELIHAN,
        value: quantity,
        note: "Penambahan dari timbangan"
      })
      
      toast({
        title: "Success",
        description: `${quantity} ${selectedProduct} ditambah ke counter`,
      })
      // Reset quantity
      setQuantity(0)
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      })
    }
  }

  // const handleDecreaseProduct = async (id: number) => {
  //   try {
  //     // Update local counter
  //     setCounters((prev) => ({
  //       ...prev,
  //       [id]: Math.max(0, prev[id] - 1),
  //     }))

  //     // Add to history
  //     const currentTime = new Date().toLocaleTimeString()
  //     setHistory((prev) => [
  //       {
  //         text: `🔴➖ 1 from ${getProductName(id)}`,
  //         time: currentTime,
  //       },
  //       ...prev.slice(0, 19), // Keep only last 20 items
  //     ])

  //     // Use context method to memindahkan product
  //     updateProduct({
  //       productId: id,
  //       operation: "memindahkan",
  //       place: Counter.PENYEMBELIHAN,
  //       value: 1,
  //       note: "Decreased from counter timbang"
  //     })
  //   } catch (error) {
  //     console.error("Error decreasing product:", error)
  //     toast({
  //       title: "Error",
  //       description: "Failed to memindahkan product. Please try again.",
  //       variant: "destructive",
  //     })
  //   }
  // }

  // Shipping functions
  const handleCreateShipment = async () => {
    if (shipmentProducts.length === 0) {
      toast({
        title: "Empty shipment",
        description: "Please add at least one product to the shipment",
        variant: "destructive",
      })
      return
    }

    setIsCreatingShipment(true)

    try {
       // First update products with "memindahkan" operation
      for (const item of shipmentProducts) {
        await updateProduct({
          productId: item.produkId,
          operation: "memindahkan",
          place: Counter.PENYEMBELIHAN,
          value: item.jumlah,
          note: `Dipindahkan ke inventori: ${shipmentNote}`
        })

        // Add to history with "-" symbol
        const currentTime = new Date().toLocaleTimeString()
        setHistory((prev) => [
          {
            text: `🔴➖${item.jumlah} ${getProductName(item.produkId)}`,
            time: currentTime,
          },
          ...prev.slice(0, 19),
        ])
      }
      // Use context method to create shipment
      await createShipment(shipmentProducts, shipmentNote)

      toast({
        title: "Pengiriman dicatat",
        description: "Pengiriman Produk dapat segera dikirim ke inventori",
      })

      // Reset shipment form
      setShipmentProducts([])
      setShipmentNote("")
    } catch (error) {
      console.error("Error creating shipment:", error)
      toast({
        title: "Error",
        description: "Gagal mencatat pengiriman. Coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingShipment(false)
    }
  }
  const handleAddToShipment = (produkId: number, jumlah: number) => {
    const product = getProductById(produkId)
    if (!product) return

    if (jumlah <= 0 || jumlah > product.diTimbang) {
      toast({
        title: "Invalid quantity",
        description: `Quantity must be between 1 and ${product.diTimbang}`,
        variant: "destructive",
      })
      return
    }

    // Check if product already exists in shipment
    const existingIndex = shipmentProducts.findIndex((p) => p.produkId === produkId)

    if (existingIndex >= 0) {
      // Update existing product
      const updatedProducts = [...shipmentProducts]
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        jumlah: updatedProducts[existingIndex].jumlah + jumlah,
      }
      setShipmentProducts(updatedProducts)
    } else {
      // Add new product
      setShipmentProducts([...shipmentProducts, {
        produkId, jumlah,
        id: 0,
        produk: {
          id: 0,
          nama: ""
        }
      }])
    }

    toast({
      title: "Added to shipment",
      description: `Added ${jumlah} of ${getProductName(produkId)} to shipment`,
    })
  }

  const handleRemoveFromShipment = (produkId: number) => {
    setShipmentProducts(shipmentProducts.filter((p) => p.produkId !== produkId))
  }
  const handleShowProductHistory = (produkId: number) => {
    setSelectedProductForHistory(produkId)
    setShowProductHistory(true)
  }
  // Show loading state while products are loading
  if (productsQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">Loading products...</div>
        </div>
      </div>
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderLogSymbol = (event: string) => {
    switch(event) {
      case "menambahkan":
        return "🔵➕";
      case "memindahkan":
        return "🔴➖";
      case "mengkoreksi":
        return "🟡✏️";
      default:
        return "⚪";
    }
  }
  // Show error state if products failed to load
  if (productsQuery.isError) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center p-8">
          <div className="text-lg text-red-500">Failed to load products. Please refresh the page.</div>
        </div>
      </div>
    )
  }
 const handleExportToExcel = () => {
    const rows = allProdukHewan.map(p => ({
      ID: p.id,
      Nama: p.nama,
      Tipe: p.tipe_hewan?.nama || "-",
      Jenis: p.JenisProduk,
      Berat: p.berat ?? 0,
      "Target Paket": p.targetPaket,
      "Paket di Pemotongan": p.diTimbang,
      "Paket di Inventori": p.diInventori,
      "Paket Didistribusi": p.sdhDiserahkan,
      "Counter Saat Ini": counters[p.id] || 0,
    }))

    exportToExcel(rows, `counter_timbang_${new Date().toISOString().split('T')[0]}`)
  }
  return (
    <div className="space-y-8">
      <ConnectionStatus isConnected={isConnected} />

      <Tabs defaultValue="timbang">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timbang">Timbang</TabsTrigger>
          <TabsTrigger value="pengiriman">Pengiriman ke Inventori</TabsTrigger>
        </TabsList>

        <TabsContent value="timbang">
          <Card>
            <CardHeader>
              <CardTitle>Select Weight and Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Select Product</h3>
                  {produkDaging.length > 0 ? (
                    <RadioGroup
                      value={selectedProduct.toString()}
                      onValueChange={(value) => {
                      const parsed = Number.parseInt(value);
                      if (parsed !== selectedProduct) {
                        setSelectedProduct(parsed);
                      }
                    }}
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
                  ) : (
                    <div className="text-center p-4 border rounded-md">No meat products available</div>
                  )}
                </div>

                <div className="space-y-0 bg-gray-50/50 rounded-lg border p-2">
                  <h3 className="text-lg font-semibold text-gray-800">Select Quantity</h3>
                  
                  {/* Main quantity input with +/- controls */}
                  <div className="flex items-center justify-center space-x-3 py-2 px-4">
                    {/* Subtract buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddQuantity(-10)}
                        disabled={quantity < 10}
                        className="h-10 w-10 rounded-full flex-1 min-w-0 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 disabled:opacity-50"
                      >
                        -10
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddQuantity(-5)}
                        disabled={quantity < 5}
                        className="h-10 w-10 rounded-full flex-1 min-w-0 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 disabled:opacity-50"
                      >
                        -5
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleAddQuantity(-1)}
                      disabled={quantity <= 0}
                      className="h-10 w-10 rounded-full bg-red-50 border-red-200 hover:bg-red-50 hover:border-red-200 disabled:opacity-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center space-y-1">
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => handleSetQuantity(e.target.value)}
                        min={0}
                        className="w-20 text-center text-lg font-semibold border-2 focus:border-blue-400"
                      />
                      <span className="pl-1 text-xs text-gray-500">Qty</span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleAddQuantity(1)}
                      className="h-10 w-10 rounded-full bg-green-50 border-green-200 hover:bg-green-50 hover:border-green-200"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {/* Add buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddQuantity(5)}
                        className="h-10 w-10 rounded-full flex-1 min-w-0 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                      >
                        +5
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddQuantity(10)}
                        className="h-10 w-10 rounded-full flex-1 min-w-0 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                      >
                        +10
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-5 px-5 justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setQuantity(0)}
                      className="w-full text-gray-500 hover:text-gray-700"
                    >
                      Reset to 0
                    </Button>
                    <Button 
                      onClick={handleSubmit}  className="w-full"
                      disabled={!selectedProduct || quantity <= 0}
                    >
                      Submit
                    </Button>
                  </div>
                  
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="flex-row gap-8">
              <CardTitle>Produk di Counter Timbang</CardTitle>
              <Button variant="outline" onClick={handleExportToExcel} className="w-full md:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {Object.entries(groupedProducts).map(([jenisHewan, products]) => (
                  <div key={jenisHewan}>
                    <h2 className="text-2xl font-bold mb-4 capitalize">
                      {jenisHewan.toLowerCase()} {/* Display "sapi", "domba", etc. */}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {products.map((product) => (
                        <div key={product.id} className="flex flex-col items-center p-4 border rounded-md shadow-sm bg-white">
                          <span className="text-lg mb-2 text-center font-semibold">{product.nama}</span>
                          <span className="text-3xl font-bold text-green-600"> {product.diTimbang}</span>
                          
                          <div className="flex mt-1 gap-3">
                            <span className="text-xs font-bold">Kumulatif: {product.kumulatif}</span>
                            {product.targetPaket > 0 && (
                              <div className="text-xs text-gray-500">
                                Target: {product.targetPaket}
                              </div>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleShowProductHistory(product.id)}>
                              History
                            </Button>
                          </div>
                          {/* You could add more product details here if needed */}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>History Penambahan & Pemindahan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {history.map((item, index) => (
                  <li key={index} className="text-sm">
                    {item.text} ({item.time})
                  </li>
                ))}
                {history.length === 0 && (
                  <li className="text-sm text-muted-foreground">Belum ada history</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pengiriman">
          <Card>
            <CardHeader>
              <CardTitle>Create Shipment to Inventory</CardTitle>
              <CardDescription>Select products to send to the inventory counter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Available Products</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allProdukHewan
                      .filter((product) => product.diTimbang > 0)
                      .map((product) => (
                        <div key={product.id} className="border rounded-md p-4">
                          <div className="font-medium">{product.nama}</div>
                          <div className="text-sm text-muted-foreground">Available: {product.diTimbang}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              min={1}
                              max={product.diTimbang}
                              defaultValue="1"
                              className="w-20"
                              id={`qty-${product.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const input = document.getElementById(`qty-${product.id}`) as HTMLInputElement
                                const value = Number.parseInt(input.value)
                                if (!isNaN(value) && value > 0 && value <= product.diTimbang) {
                                  handleAddToShipment(product.id, value)
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                  {allProdukHewan.filter((product) => product.diTimbang > 0).length === 0 && (
                    <div className="text-center p-4 border rounded-md">No products available for shipment</div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Products to Ship</h3>
                  {shipmentProducts.length > 0 ? (
                    <div className="space-y-2">
                      {shipmentProducts.map((item, index) => {
                        const product = getProductById(item.produkId)
                        return (
                          <div key={index} className="flex justify-between items-center border p-3 rounded-md">
                            <div>
                              <span className="font-medium">{product?.nama}</span>
                              <span className="ml-2 text-sm text-muted-foreground">Quantity: {item.jumlah}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleRemoveFromShipment(index)}>
                              Remove
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-4 border rounded-md">No products added to shipment yet</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipment-note">Notes (Optional)</Label>
                  <Textarea
                    id="shipment-note"
                    placeholder="Add any notes about this shipment"
                    value={shipmentNote}
                    onChange={(e) => setShipmentNote(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateShipment}
                  disabled={shipmentProducts.length === 0 || isCreatingShipment}
                >
                  {isCreatingShipment ? "Creating Shipment..." : "Create Shipment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Tabs defaultValue="shipment">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shipment">Shipment</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="shipment">
          <Card>
            <CardHeader>
              <CardTitle>Create Shipment</CardTitle>
              <CardDescription>Send products to inventory</CardDescription>
            </CardHeader>
            <CardContent>
              {shipmentProducts.length > 0 ? (
                <div className="space-y-4">
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Products to Ship</h3>
                    <ul className="space-y-2">
                      {shipmentProducts.map((item) => {
                        const product = productsQuery.data.find((p) => p.id === item.produkId)
                        return (
                          <li key={item.produkId} className="flex justify-between items-center">
                            <span>
                              {product?.nama}: {item.jumlah} units
                            </span>
                            <Button size="sm" variant="outline" onClick={() => handleRemoveFromShipment(item.produkId)}>
                              Remove
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  <div>
                    <Label htmlFor="shipmentNote">Shipment Note</Label>
                    <Textarea
                      id="shipmentNote"
                      placeholder="Add a note about this shipment"
                      value={shipmentNote}
                      onChange={(e) => setShipmentNote(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleCreateShipment} disabled={isCreatingShipment}>
                      {isCreatingShipment ? "Creating..." : "Create Shipment"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 border rounded-md">
                  <p>No products added to shipment yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add products from the Inventory tab to create a shipment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Operation History</CardTitle>
              <CardDescription>Recent inventory operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productLogs.length > 0 ? (
                  productLogs.map((log) => (
                    <div key={log.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <div className="font-medium">{log.produk.nama}</div>
                        <div className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            log.event === "menambahkan" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.event === "menambahkan" ? "➕" : "➖"}
                        </span>
                        <span>{log.value} units</span>
                      </div>
                      {log.note && <div className="mt-2 text-sm">{log.note}</div>}
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4">Belum ada catatan</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product History Dialog */}
      <Dialog open={showProductHistory} onOpenChange={setShowProductHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Product History - {productsQuery.data.find((p) => p.id === selectedProductForHistory)?.nama}
            </DialogTitle>
            <DialogDescription>Log riwayat produk ini</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 my-4">
            {productLogs
              .filter((log) => log.produkId === selectedProductForHistory)
              .map((log) => (
                <div key={log.id} className="border rounded-md p-3">
                  <div className="flex justify-between">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        log.event === "menambahkan" ? "bg-green-100 text-green-800" : 
                        log.event === "memindahkan" ? "bg-red-100 text-red-800" : 
                        "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {log.event === "menambahkan" ? "🔵➕" : 
                      log.event === "memindahkan" ? "🔴➖" : 
                      "✏️"}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium">Jumlah:</span> {log.value} unit
                  </div>
                  {log.note && (
                    <div className="mt-1">
                      <span className="font-medium">Catatan:</span> {log.note}
                    </div>
                  )}
                </div>
              ))}

            {productLogs.filter((log) => log.produkId === selectedProductForHistory).length === 0 && (
              <div className="text-center p-4">Tidak ada history untuk produk ini</div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowProductHistory(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}