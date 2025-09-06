/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Plus, Edit, Trash2, Phone, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Address {
  id: string
  name: string
  street: string
  city: string
  province: string
  postalCode?: string
  country: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  isPrimary: boolean
  isActive: boolean
}

export default function SettingsPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Indonesia",
    latitude: "",
    longitude: "",
    phone: "",
    email: "",
    isPrimary: false,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchAddresses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAddresses = async () => {
    try {
      const response = await fetch("/api/address")
      const data = await response.json()
      setAddresses(data.addresses || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat alamat",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingAddress ? `/api/address/${editingAddress.id}` : "/api/address"
      const method = editingAddress ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: editingAddress ? "Alamat berhasil diperbarui" : "Alamat berhasil ditambahkan",
        })
        setIsDialogOpen(false)
        resetForm()
        fetchAddresses()
      } else {
        throw new Error("Failed to save address")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan alamat",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (address: Address) => {
    setEditingAddress(address)
    setFormData({
      name: address.name,
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode || "",
      country: address.country,
      latitude: address.latitude?.toString() || "",
      longitude: address.longitude?.toString() || "",
      phone: address.phone || "",
      email: address.email || "",
      isPrimary: address.isPrimary,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) return

    try {
      const response = await fetch(`/api/address/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Alamat berhasil dihapus",
        })
        fetchAddresses()
      } else {
        throw new Error("Failed to delete address")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus alamat",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      street: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Indonesia",
      latitude: "",
      longitude: "",
      phone: "",
      email: "",
      isPrimary: false,
    })
    setEditingAddress(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pengaturan</h1>
            <p className="text-muted-foreground">Kelola alamat dan informasi kontak</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Alamat
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingAddress ? "Edit Alamat" : "Tambah Alamat Baru"}</DialogTitle>
                <DialogDescription>Masukkan informasi alamat lengkap</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lokasi</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Kantor Pusat, Gudang, dll"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Negara</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Alamat Jalan</Label>
                  <Textarea
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Jalan, nomor, RT/RW, dll"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Kota</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provinsi</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Kode Pos</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="-6.2088"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="106.8456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telepon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62 xxx xxxx xxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPrimary"
                    checked={formData.isPrimary}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                  />
                  <Label htmlFor="isPrimary">Jadikan alamat utama</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">{editingAddress ? "Perbarui" : "Simpan"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {addresses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">Belum ada alamat yang ditambahkan</p>
              </CardContent>
            </Card>
          ) : (
            addresses.map((address) => (
              <Card key={address.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {address.name}
                      </CardTitle>
                      {address.isPrimary && <Badge variant="default">Utama</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(address)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(address.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">{address.street}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.province} {address.postalCode}
                    </p>
                    <p className="text-sm text-muted-foreground">{address.country}</p>

                    {(address.phone || address.email) && (
                      <div className="flex items-center gap-4 pt-2">
                        {address.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {address.phone}
                          </div>
                        )}
                        {address.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {address.email}
                          </div>
                        )}
                      </div>
                    )}

                    {address.latitude && address.longitude && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">
                          Koordinat: {address.latitude}, {address.longitude}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
