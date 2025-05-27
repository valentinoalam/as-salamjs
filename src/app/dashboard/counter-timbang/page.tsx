"use client"

import { useState } from "react"
import { useQurban } from "@/contexts/qurban-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Counter } from "@prisma/client"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createShipment } from "./actions"

export default function CounterTimbangPage() {
  const { productsQuery, isConnected, updateProduct, getProductLogsByPlace } = useQurban()
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const [operation, setOperation] = useState<"add" | "decrease">("add")
  const [shipmentProducts, setShipmentProducts] = useState<{ produkId: number; jumlah: number }[]>([])
  const [shipmentNote, setShipmentNote] = useState("")
  const [isCreatingShipment, setIsCreatingShipment] = useState(false)
  const [showProductHistory, setShowProductHistory] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<number | null>(null)

  // Get product logs for the Counter.PENYEMBELIHAN place
  const productLogs = getProductLogsByPlace(Counter.PENYEMBELIHAN)

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

  const handleAddToShipment = () => {
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

  const handleRemoveFromShipment = (produkId: number) => {
    setShipmentProducts(shipmentProducts.filter((p) => p.produkId !== produkId))
  }

  const handleCreateShipment = async () => {
    if (shipmentProducts.length === 0) return

    setIsCreatingShipment(true)

    try {
      await createShipment(shipmentProducts, shipmentNote || undefined)

      // Reset form
      setShipmentProducts([])
      setShipmentNote("")
      toast({
        title: "Success",
        description: "Shipment created successfully",
      })
    } catch (error) {
      console.error("Error creating shipment:", error)
      toast({
        title: "Error",
        description: "Failed to create shipment",
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

  if (productsQuery.isLoading) {
    return <div>Loading...</div>
  }

  if (productsQuery.isError) {
    return <div>Error loading products</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
        <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

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
                  <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProduct} disabled={!selectedProduct || quantity <= 0}>
                    Update Inventory
                  </Button>
                  <Button
                    onClick={handleAddToShipment}
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
