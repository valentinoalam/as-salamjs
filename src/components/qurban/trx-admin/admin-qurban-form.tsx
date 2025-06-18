"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CaraBayar, PaymentStatus } from "@prisma/client"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { adminQurbanSchema, getPaymentStatusFromAmount, type AdminQurbanFormValues } from "@/lib/zod/qurban-form"
import type { TipeHewan } from "@/types/keuangan"
import { ProductSelectionCard } from "../trx-user/product-selection-card"

interface AdminQurbanFormProps {
  tipeHewan: TipeHewan[]
  onSubmit: (data: AdminQurbanFormValues) => Promise<{ success: boolean; error?: string; mudhohiId?: string }>
  onCancel?: () => void
  initialData?: Partial<AdminQurbanFormValues>
}

export function AdminQurbanForm({ tipeHewan, onSubmit, onCancel, initialData }: AdminQurbanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<TipeHewan | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initialData?.jatahPengqurban || []);
  const form = useForm<AdminQurbanFormValues>({
    resolver: zodResolver(adminQurbanSchema),
    defaultValues: {
      tipeHewanId: initialData?.tipeHewanId || "",
      quantity: initialData?.quantity || 1,
      isKolektif: initialData?.isKolektif || false,
      nama_pengqurban: initialData?.nama_pengqurban || "",
      nama_peruntukan: initialData?.nama_peruntukan || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      alamat: initialData?.alamat || "",
      pesan_khusus: initialData?.pesan_khusus || "",
      keterangan: initialData?.keterangan || "",
      potong_sendiri: initialData?.potong_sendiri || false,
      ambil_daging: initialData?.ambil_daging || false,
      createdAt: initialData?.createdAt || new Date(),
      cara_bayar: initialData?.cara_bayar || CaraBayar.TRANSFER,
      paymentStatus: initialData?.paymentStatus || PaymentStatus.BELUM_BAYAR,
      dibayarkan: initialData?.dibayarkan || 0,
      kodeResi: initialData?.kodeResi || "",
      jatahPengqurban: initialData?.jatahPengqurban || [],
    },
  })

  const { watch } = form
  const watchedValues = watch(["tipeHewanId", "quantity", "isKolektif"])

  // Auto-update dibayarkan when paymentStatus is set to LUNAS
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "paymentStatus" && value.paymentStatus === PaymentStatus.LUNAS) {
        form.setValue("dibayarkan", totalAmount)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, totalAmount])

  // Auto-update paymentStatus when dibayarkan changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "dibayarkan" && typeof value.dibayarkan === "number") {
        const newStatus = getPaymentStatusFromAmount(value.dibayarkan, totalAmount)
        if (newStatus !== value.paymentStatus && newStatus !== PaymentStatus.MENUNGGU_KONFIRMASI) {
          form.setValue("paymentStatus", newStatus)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form, totalAmount])

  // Update selected animal and total amount
  useEffect(() => {
    const [tipeHewanId, quantity, isKolektif] = watchedValues

    if (tipeHewanId) {
      const animal = tipeHewan.find((t) => t.id.toString() === tipeHewanId)
      setSelectedAnimal(animal || null)

      if (animal) {
        const price = isKolektif && animal.hargaKolektif ? animal.hargaKolektif : animal.harga
        setTotalAmount(price * (quantity || 1))
      }
    } else {
      setSelectedAnimal(null)
      setTotalAmount(0)
    }
  }, [watchedValues, tipeHewan])

  const handleSubmitForm = async (data: AdminQurbanFormValues) => {
    setIsSubmitting(true)

    try {
      const result = await onSubmit(data)

      if (result.success) {
        toast({
          title: "Berhasil!",
          description: "Data pengqurban berhasil ditambahkan",
        })
      } else {
        throw new Error(result.error || "Terjadi kesalahan")
      }
    } catch (error) {
      console.error("Form submission error:", error)
      toast({
        title: "Error",
        description: "Gagal menyimpan data. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmitForm)}>
          <Card>
            <CardHeader>
              <CardTitle>Tambah Data Pengqurban</CardTitle>
              <CardDescription>Isi data pengqurban dan informasi qurban</CardDescription>
            </CardHeader>

            <CardContent>
              <FormField
                control={form.control}
                name="tipeHewanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilih Jenis Hewan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis hewan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tipeHewan.map((tipe) => (
                          <SelectItem key={tipe.id} value={tipe.id.toString()}>
                            {tipe.icon} {tipe.nama} - Rp {tipe.harga.toLocaleString("id-ID")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Hewan</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedAnimal?.hargaKolektif && (
                  <FormField
                    control={form.control}
                    name="isKolektif"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Qurban Kolektif</FormLabel>
                          <FormDescription>
                            Harga: Rp {selectedAnimal.hargaKolektif!.toLocaleString("id-ID")} per orang
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {totalAmount > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Biaya:</span>
                    <span className="text-xl font-bold text-primary">Rp {totalAmount.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nama_pengqurban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Pengqurban *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Masukkan nama lengkap" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nama_peruntukan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Peruntukan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Atas nama siapa qurban ini (opsional)" />
                      </FormControl>
                      <FormDescription>Kosongkan jika qurban untuk diri sendiri</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="nama@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="08xxxxxxxxxx" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat Lengkap *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Masukkan alamat lengkap termasuk kota dan kode pos"
                        className="min-h-20"
                      />
                    </FormControl>
                    <FormDescription>
                      Alamat lengkap untuk keperluan distribusi daging qurban (jika diperlukan)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Preferensi Penyembelihan</h2>
                <FormField
                  control={form.control}
                  name="ambil_daging"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Mengambil Daging Qurban</FormLabel>
                        <FormDescription>
                          Pengqurban ingin mengambil bagian daging dari hewan qurban
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="potong_sendiri"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Hadir/Menyembelih</FormLabel>
                        <FormDescription>Centang jika Pengqurban ingin hadir saat penyembelihan atau menyembelih sendiri hewan qurban</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />
              <h2 className="text-xl font-semibold">Informasi Tambahan</h2>
              <FormField
                control={form.control}
                name="jatahPengqurban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pilih Jatah Daging (Maksimal 2)</FormLabel>
                    <FormControl>
                      <ProductSelectionCard
                        jenisHewan={selectedAnimal!.jenis}
                        // tipeHewanId={parseInt(form.watch("tipeHewanId"))}
                        selectedProducts={selectedProducts}
                        onChange={(selected) => {
                          field.onChange(selected);
                          setSelectedProducts(selected);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pesan_khusus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pesan Khusus</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Pesan khusus dari pengqurban (opsional)"
                        className="min-h-20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keterangan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keterangan Tambahan</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Keterangan tambahan (opsional)" className="min-h-20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="createdAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Transaksi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cara_bayar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metode Pembayaran</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih metode pembayaran" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CaraBayar.TRANSFER}>Transfer Bank</SelectItem>
                          <SelectItem value={CaraBayar.TUNAI}>Tunai</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Pembayaran</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih status pembayaran" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={PaymentStatus.BELUM_BAYAR}>Belum Bayar</SelectItem>
                          <SelectItem value={PaymentStatus.DOWN_PAYMENT}>Down Payment</SelectItem>
                          <SelectItem value={PaymentStatus.MENUNGGU_KONFIRMASI}>Menunggu Konfirmasi</SelectItem>
                          <SelectItem value={PaymentStatus.LUNAS}>Lunas</SelectItem>
                          <SelectItem value={PaymentStatus.BATAL}>Batal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dibayarkan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Dibayarkan</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormDescription>Masukkan jumlah yang sudah dibayar</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="kodeResi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Resi</FormLabel>
                    <FormControl>
                      <Input id="kodeResi" placeholder="Masukkan kode resi (opsional)" {...field} />
                    </FormControl>
                    <FormDescription>Masukkan kode resi setelah pembayaran lunas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary */}
              <div className="bg-muted p-6 rounded-lg space-y-4">
                <h4 className="font-semibold">Ringkasan Pemesanan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Nama Pengqurban:</span>
                    <span className="font-medium">{form.watch("nama_pengqurban") || "-"}</span>
                  </div>
                  {form.watch("nama_peruntukan") && (
                    <div className="flex justify-between">
                      <span>Nama Peruntukan:</span>
                      <span className="font-medium">{form.watch("nama_peruntukan")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Jenis Hewan:</span>
                    <span className="font-medium">
                      {selectedAnimal?.nama} {form.watch("isKolektif") ? "(Kolektif)" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jumlah:</span>
                    <span className="font-medium">{form.watch("quantity")} ekor</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Pembayaran:</span>
                    <span className="text-primary">Rp {totalAmount.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t p-6">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Data"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}
