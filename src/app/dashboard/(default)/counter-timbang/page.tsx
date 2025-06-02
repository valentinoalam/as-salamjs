/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { useQurban, type ProdukHewan } from "@/contexts/qurban-context"
import { ConnectionStatus } from "@/components/connection-status"
import { exportToExcel } from "@/lib/excel"
import { Download } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
  const [note, setNote] = useState("")
  const [operation, setOperation] = useState<"add" | "decrease">("add")
  const [showProductHistory, setShowProductHistory] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<number | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<number>(produkDaging[0]?.id || 0)
  const [quantity, setQuantity] = useState<number>(0)
  const [counters, setCounters] = useState<Record<number, number>>({})
  const [history, setHistory] = useState<Array<{ text: string; time: string }>>([])
  // Shipping state
  const [shipmentProducts, setShipmentProducts] = useState<{ produkId: number; jumlah: number }[]>([])
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
      // setSelectedProduct(produkDaging[0]?.id || 0)
    }
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

      // Use context method to update product
      updateProduct({
        productId: selectedProduct,
        operation: "add",
        place: Counter.PENYEMBELIHAN,
        value: quantity,
        note: "Added from counter timbang"
      })

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
  const handleUpdateProduct = async () => {
    if (!selectedProduct || quantity <= 0) return

    try {
      await updateProduct({
        productId: selectedProduct,
        operation,
        place: Counter.PENYEMBELIHAN,
        value: quantity,
        note,
      })

      // Reset form
      setQuantity(1)
      setNote("")
      toast({
        title: "Success",
        description: `Product ${operation === "add" ? "added to" : "removed from"} inventory`,
      })
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFromShipment = (produkId: number) => {
    setShipmentProducts(shipmentProducts.filter((p) => p.produkId !== produkId))
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

  //     // Use context method to decrease product
  //     updateProduct({
  //       productId: id,
  //       operation: "decrease",
  //       place: Counter.PENYEMBELIHAN,
  //       value: 1,
  //       note: "Decreased from counter timbang"
  //     })
  //   } catch (error) {
  //     console.error("Error decreasing product:", error)
  //     toast({
  //       title: "Error",
  //       description: "Failed to decrease product. Please try again.",
  //       variant: "destructive",
  //     })
  //   }
  // }

  // Shipping functions
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
      setShipmentProducts([...shipmentProducts, { produkId, jumlah }])
    }

    toast({
      title: "Added to shipment",
      description: `Added ${jumlah} of ${getProductName(produkId)} to shipment`,
    })
  }

  const handleAddToShipments = () => {
    if (!selectedProduct || quantity <= 0) return

    // Check if product already exists in shipment
    const existingProductIndex = shipmentProducts.findIndex((p) => p.produkId === selectedProduct)

    if (existingProductIndex >= 0) {
      // Update existing product
      const updatedProducts = [...shipmentProducts]
      updatedProducts[existingProductIndex].jumlah += quantity
      setShipmentProducts(updatedProducts)
    } else {
      // Add new product
      setShipmentProducts([...shipmentProducts, { produkId: selectedProduct, jumlah: quantity }])
    }

    // Reset form
    setQuantity(1)
    toast({
      title: "Added to shipment",
      description: `Product added to pending shipment`,
    })
  }
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
      // Use context method to create shipment
      await createShipment(shipmentProducts, shipmentNote)

      toast({
        title: "Shipment created",
        description: "The shipment has been created and sent to inventory",
      })

      // Reset shipment form
      setShipmentProducts([])
      setShipmentNote("")
    } catch (error) {
      console.error("Error creating shipment:", error)
      toast({
        title: "Error",
        description: "Failed to create shipment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingShipment(false)
    }
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

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Select Quantity</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleSetQuantity(e.target.value)}
                      min={0}
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
                  <Button 
                    onClick={handleSubmit} 
                    className="w-full"
                    disabled={!selectedProduct || quantity <= 0}
                  >
                    Submit
                  </Button>
                  <Button variant="outline" onClick={handleExportToExcel} className="w-full md:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Produk di Counter Timbang</CardTitle>
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
              <CardTitle>History Penambahan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {history.map((item, index) => (
                  <li key={index} className="text-sm">
                    {item.text} ({item.time})
                  </li>
                ))}
                {history.length === 0 && (
                  <li className="text-sm text-muted-foreground">No history yet</li>
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
      
      <Tabs defaultValue="inventory">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="shipment">Shipment</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Update Inventory</CardTitle>
              <CardDescription>Add or remove products from inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product">Product</Label>
                    <select
                      id="product"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedProduct || ""}
                      onChange={(e) => setSelectedProduct(Number(e.target.value))}
                    >
                      <option value="">Select a product</option>
                      {productsQuery.data.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.nama} ({product.diTimbang} in inventory)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="operation">Operation</Label>
                  <select
                    id="operation"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as "add" | "decrease")}
                  >
                    <option value="add">Add</option>
                    <option value="decrease">Remove</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    placeholder="Add a note about this operation"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedProduct(0)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProduct} disabled={!selectedProduct || quantity <= 0}>
                    Update Inventory
                  </Button>
                  <Button
                    onClick={handleAddToShipments}
                    disabled={!selectedProduct || quantity <= 0 || operation !== "add"}
                  >
                    Add to Shipment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Current Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productsQuery.data.map((product) => (
                  <div key={product.id} className="flex flex-col items-center p-4 border rounded-md">
                    <span className="text-lg mb-2">{product.nama}</span>
                    <span className="text-3xl font-bold">{product.diTimbang}</span>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleShowProductHistory(product.id)}>
                        History
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                            log.event === "add" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.event === "add" ? "Added" : "Removed"}
                        </span>
                        <span>{log.value} units</span>
                      </div>
                      {log.note && <div className="mt-2 text-sm">{log.note}</div>}
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4">No history available</div>
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
            <DialogDescription>History of operations for this product</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-4 my-4">
            {productLogs
              .filter((log) => log.produkId === selectedProductForHistory)
              .map((log) => (
                <div key={log.id} className="border rounded-md p-3">
                  <div className="flex justify-between">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        log.event === "add" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.event === "add" ? "Added" : "Removed"}
                    </span>
                    <div className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium">Quantity:</span> {log.value} units
                  </div>
                  {log.note && (
                    <div className="mt-1">
                      <span className="font-medium">Note:</span> {log.note}
                    </div>
                  )}
                </div>
              ))}

            {productLogs.filter((log) => log.produkId === selectedProductForHistory).length === 0 && (
              <div className="text-center p-4">No history available for this product</div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowProductHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}