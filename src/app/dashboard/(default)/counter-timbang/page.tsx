"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
// import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Counter, JenisHewan } from "@prisma/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConnectionStatus } from "@/components/connection-status"
import { exportToExcel } from "#@/lib/utils/excel.ts"
import { Download, Minus, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ProdukHewan, ShipmentProduct } from "@/types/qurban"
import { ShipmentHistory } from "@/components/qurban/shipment-history"
import { useProduct } from "#@/hooks/qurban/use-produk.tsx"
import { useTabStore } from "#@/stores/ui-store.ts"

export default function CounterTimbangPage() {
  const { 
    productsQuery, 
    isConnected, 
    updateProduct, 
    createShipment,
    getProductsByType,
    getProductById,
    getProductLogsByPlace
  } = useProduct()
  const { tabs, setActiveTab } = useTabStore()
  const productLogs = getProductLogsByPlace(Counter.TIMBANG)
  // Filter products for daging (meat) products
  const produkDaging = getProductsByType('daging')
  const allProdukHewan = getProductsByType('all')
  type GroupedProdukHewan = {
    [key in JenisHewan]?: ProdukHewan[];
  };

  const groupedProducts = allProdukHewan.reduce((acc: GroupedProdukHewan, product) => {
    if (product.JenisHewan) {
      const jenisHewan = product.JenisHewan;
      if (!acc[jenisHewan]) {
        acc[jenisHewan] = [];
      }
      acc[jenisHewan]?.push(product);
    }
    return acc;
  }, {});
  // const [note, setNote] = useState("")
  // const [event, setOperation] = useState<"menambahkan" | "memindahkan" | "mengkoreksi">("menambahkan")
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
  // New state for expandable quantity input
  const [showQuantityDialog, setShowQuantityDialog] = useState(false)
  const [selectedProductForShipment, setSelectedProductForShipment] = useState<number | null>(null)
  const [tempQuantity, setTempQuantity] = useState<number>(0)
  const [originalAvailable, setOriginalAvailable] = useState<Record<number, number>>({})

  // Initialize counters when products load
  useEffect(() => {
    if (produkDaging.length > 0) {
      const initialCounters: Record<number, number> = {}
      const initialAvailable: Record<number, number> = {}
      produkDaging.forEach((product) => {
        initialCounters[product.id] = 0
        initialAvailable[product.id] = product.diTimbang
      })
      setCounters(initialCounters)
      setOriginalAvailable(initialAvailable)
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


  // Initialize temp available when allProdukHewan changes
  useEffect(() => {
    if (allProdukHewan.length > 0) {
      const initialAvailable: Record<number, number> = {}
      allProdukHewan.forEach((product) => {
        initialAvailable[product.id] = product.diTimbang
      })
      setOriginalAvailable(initialAvailable)
    }
  }, [allProdukHewan])

  const getProductName = (id: number) => {
    const product = getProductById(id)
    return product ? product.nama : "Unknown Product"
  }

  const handleAddQuantity = (value: number) => {
    setQuantity((prev) => prev + value)
  }

  // const handleSetQuantity = (value: string) => {
  //   const numValue = Number.parseInt(value)
  //   if (!isNaN(numValue) && numValue >= 0) {
  //     setQuantity(Math.max(1, numValue))
  //   }
  // }

  const handleSubmit = async () => {
    if (!selectedProduct || quantity <= 0) return

    try {
      // Update local counter
      setCounters((prev) => ({
        ...prev,
        [selectedProduct]: (prev[selectedProduct] || 0) + quantity,
      }))
      const productName = getProductName(selectedProduct)
      // Add to history
      const currentTime = new Date().toLocaleTimeString()
      setHistory((prev) => [
        {
          text: `🔵➕ ${quantity} ${productName}`,
          time: currentTime,
        },
        ...prev.slice(0, 19), // Keep only last 20 items
      ])

      // Use context method to update product
      await updateProduct({
        produkId: selectedProduct,
        event: "menambahkan",
        place: Counter.TIMBANG,
        value: quantity,
        note: "Penambahan dari timbangan"
      })
      
      toast({
        title: "Success",
        description: `${quantity} ${productName} ditambah ke counter`,
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

  // Get total quantity already added to shipment for a specific product
  const getShipmentQuantity = (produkId: number) => {
    const shipmentItem = shipmentProducts.find(p => p.produkId === produkId)
    return shipmentItem ? shipmentItem.jumlah : 0
  }

  // Get actual available stock (original - already in shipment)
  const getActualAvailable = (produkId: number) => {
    const product = allProdukHewan.find(p => p.id === produkId)
    const originalStock = product ? product.diTimbang : 0
    const alreadyInShipment = getShipmentQuantity(produkId)
    return Math.max(0, originalStock - alreadyInShipment)
  }

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
       // First update products with "memindahkan" event
      for (const item of shipmentProducts) {
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

      // Reset shipment form
      setShipmentProducts([])
      setShipmentNote("")
    } catch (error) {
      console.error("Error creating shipment:", error)
    } finally {
      setIsCreatingShipment(false)
    }
  }

  const handleProductClick = (produkId: number) => {
    const actualAvailable = getActualAvailable(produkId)
    
    if (actualAvailable <= 0) {
      toast({
        title: "No stock available",
        description: "This product has no remaining stock for shipment",
        variant: "destructive",
      })
      return
    }

    setSelectedProductForShipment(produkId)
    setTempQuantity(0)
    setShowQuantityDialog(true)
  }

  const handleQuantityChange = (change: number) => {
    if (!selectedProductForShipment) return
    
    const originalAvailableAmount = originalAvailable[selectedProductForShipment] || 0
    const newQuantity = tempQuantity + change
    
    // Ensure quantity stays within bounds (1 to originalAvailableAmount)
    if (newQuantity >= 1 && newQuantity <= originalAvailableAmount) {
      setTempQuantity(newQuantity)
    }
  }

  // Calculate remaining available based on original available and current temp quantity
  const getRemainingAvailable = (produkId: number) => {
    const original = originalAvailable[produkId] || 0
    return original - tempQuantity
  }

  const handleAddToShipment = () => {
    if (!selectedProductForShipment) return
    
    const produkId = selectedProductForShipment
    const jumlah = tempQuantity
    const product = getProductById(produkId)
    if (!product) return

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

    // Close dialog and reset states
    handleCloseQuantityDialog()
  }

  const handleCloseQuantityDialog = () => {
    setShowQuantityDialog(false)
    setSelectedProductForShipment(null)
    setTempQuantity(0)
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
      Hewan: p.JenisHewan || "-",
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

      <Tabs defaultValue="timbang"
        value={tabs.counterTimbang}
        onValueChange={(value) => setActiveTab("counterTimbang", value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timbang">Timbang</TabsTrigger>
          <TabsTrigger value="pengiriman">Pengiriman ke Inventori</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
                            {product.nama}
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
                    
                    <div className="flex items-center space-y-1 space-x-1">
                      <span className="w-20 text-center text-lg font-semibold border-2 focus:border-blue-400">{quantity}</span>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3.5 lg:grid-cols-5 gap-4">
                  {allProdukHewan
                    .filter((product) => product.diTimbang > 0)
                    .map((product) => {
                      const actualAvailable = getActualAvailable(product.id)
                      const inShipment = getShipmentQuantity(product.id)
                      
                      return (
                        <div key={product.id} className="border rounded-md p-4">
                          <div 
                            className={`cursor-pointer p-2 rounded transition-colors ${
                              actualAvailable > 0 ? 'hover:bg-gray-50' : 'bg-gray-100 cursor-not-allowed'
                            }`}
                            onClick={() => actualAvailable > 0 && handleProductClick(product.id)}
                          >
                            <div className="font-medium">{product.nama}</div>
                            <div className="text-sm text-muted-foreground">
                              Total Stock: {product.diTimbang}
                            </div>
                            {inShipment > 0 && (
                              <div className="text-sm text-orange-600">
                                In Shipment: {inShipment}
                              </div>
                            )}
                            <div className={`text-sm ${actualAvailable > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              Available: {actualAvailable}
                            </div>
                            <div className={`text-xs mt-1 ${
                              actualAvailable > 0 ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              {actualAvailable > 0 ? 'Click to add to shipment' : 'No stock available'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Quantity Selection Dialog */}
                  <Dialog
                    open={showQuantityDialog}
                    onOpenChange={setShowQuantityDialog}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          Add {selectedProductForShipment ? getProductName(selectedProductForShipment) : ""} to Shipment
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Available:  {selectedProductForShipment && getActualAvailable(selectedProductForShipment)}
                          </p>
                          {getShipmentQuantity(selectedProductForShipment || 0) > 0 && (
                              <p className="text-sm text-orange-600">
                                Already in shipment: {selectedProductForShipment && getShipmentQuantity(selectedProductForShipment)}
                              </p>
                            )}
                        </div>
                        
                        <div className="flex flex-col items-center space-y-4">
                          <div className="text-center mb-4">
                            <span className="text-2xl font-bold">{tempQuantity}</span>
                            <span className="text-sm text-muted-foreground ml-2">units</span>
                          </div>
        
                          <div className="grid grid-cols-3 gap-2 w-full">
                            {[-10, -5, -1, 1, 5, 10].map((value) => (
                              <Button
                                key={value}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(value)}
                                disabled={
                                  value < 0 
                                    ? tempQuantity <= Math.abs(value)
                                    : tempQuantity + value > getActualAvailable(selectedProductForShipment!)
                                }
                              >
                                {value > 0 ? `+${value}` : value}
                              </Button>
                            ))}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            Remaining after selection: {getRemainingAvailable(selectedProductForShipment ?? 0)}
                          </p>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            onClick={handleAddToShipment}
                            className="flex-1"
                          >
                            Add to Shipment
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCloseQuantityDialog}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {allProdukHewan.filter((product) => product.diTimbang > 0).length === 0 && (
                    <div className="text-center p-4 border rounded-md">No products available for shipment</div>
                  )}
                </div>


                {shipmentProducts.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Products to Ship</h3>
                      <ul className="space-y-2">
                        {shipmentProducts.map((item) => {
                          const product = productsQuery?.data?.find((p) => p.id === item.produkId)
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
                      <Button onClick={handleCreateShipment} disabled={shipmentProducts.length === 0 || isCreatingShipment}>
                        {isCreatingShipment ? "Creating Shipment..." : "Create Shipment"}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Tabs defaultValue="riwayat-pengiriman" className="p-4">
            <TabsList>
              <TabsTrigger value="riwayat-pengiriman">Riwayat Pengiriman</TabsTrigger>
              <TabsTrigger value="riwayat-product">Riwayat PerProduk</TabsTrigger>
            </TabsList>
            <TabsContent value="riwayat-pengiriman">
              <ShipmentHistory />
            </TabsContent>
            <TabsContent value="riwayat-product">
              <Card>
                <CardHeader>
                  <CardTitle>Operation History</CardTitle>
                  <CardDescription>Recent inventory events</CardDescription>
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
        </TabsContent>
      </Tabs>

      {/* Product History Dialog */}
      <Dialog open={showProductHistory} onOpenChange={setShowProductHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Product History - {productsQuery?.data?.find((p) => p.id === selectedProductForHistory)?.nama}
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