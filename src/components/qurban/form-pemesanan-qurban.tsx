"use client"

import React, { useState, useEffect, type ForwardRefExoticComponent, type RefAttributes } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CaraBayar, PaymentStatus } from "@prisma/client"
import { ChevronLeft, ChevronRight, Check, Calendar, User, CreditCard, Package, type LucideProps, CalendarIcon } from "lucide-react"
import { Calendar as CalendarInput } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { TipeHewan } from "@/types/qurban"

// Form Schema
const qurbanFormSchema = z.object({
  // Animal Selection
  tipeHewanId: z.string().min(1, "Pilih jenis hewan terlebih dahulu"),
  quantity: z.coerce.number().min(1, "Jumlah minimal 1 ekor"),
  isKolektif: z.boolean(),
  
  // Personal Information
  nama_pengqurban: z.string().min(2, "Nama pengqurban minimal 2 karakter"),
  nama_peruntukan: z.string().optional(),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  alamat: z.string().min(5, "Alamat minimal 5 karakter"),
  // Qurban Preferences
  pesan_khusus: z.string().optional(),
  keterangan: z.string().optional(),
  potong_sendiri: z.boolean(),
  mengambilDaging: z.boolean(),
  
  // Payment Information
  createdAt:  z.date({
    required_error: "Tanggal transaksi harus diisi",
  }),
  cara_bayar: z.nativeEnum(CaraBayar),
  paymentStatus: z.nativeEnum(PaymentStatus),
  dibayarkan: z.coerce.number().min(0, "Jumlah pembayaran tidak boleh negatif"),
  kodeResi: z.string().optional()
})

export type QurbanFormInput = z.input<typeof qurbanFormSchema>
export type QurbanFormValues = z.infer<typeof qurbanFormSchema>

interface QurbanFormProps {
  tipeHewan: TipeHewan[]
  onSubmit: (data: QurbanFormValues) => Promise<{ success: boolean; error?: string; mudhohiId?: string }>
  onCancel?: () => void
  initialData?: Partial<QurbanFormInput>;
  mode?: "create" | "admin" // admin mode shows payment fields
}

type Step = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const STEPS: Step[] = [
  {
    id: "animal",
    title: "Pilih Hewan Qurban",
    description: "Pilih jenis dan jumlah hewan qurban",
    icon: Package,
  },
  {
    id: "personal",
    title: "Data Pengqurban",
    description: "Isi data diri pengqurban",
    icon: User,
  },
  {
    id: "preferences",
    title: "Preferensi Qurban",
    description: "Pilihan tambahan untuk qurban",
    icon: Calendar,
  },
  {
    id: "payment",
    title: "Pembayaran",
    description: "Metode dan informasi pembayaran",
    icon: CreditCard,
  },
]

export default function QurbanForm({ 
  tipeHewan, 
  onSubmit, 
  onCancel, 
  initialData,
  mode = "create" 
}: QurbanFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<TipeHewan | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const parsed = qurbanFormSchema.safeParse(initialData || {});
  const defaultValues = parsed.success
  ? parsed.data as QurbanFormValues
  : {
      tipeHewanId: "",
      quantity: 1,
      isKolektif: false,
      nama_pengqurban: "",
      nama_peruntukan: "",
      email: "",
      phone: "",
      alamat: "",
      pesan_khusus: "",
      keterangan: "",
      potong_sendiri: false,
      mengambilDaging: false,
      createdAt: new Date(),
      cara_bayar: CaraBayar.TRANSFER,
      paymentStatus: PaymentStatus.BELUM_BAYAR,
      dibayarkan: 0,
      kodeResi: "",
    };

  const form = useForm<QurbanFormValues>({
    resolver: zodResolver(qurbanFormSchema),
    defaultValues,
  })

  const { watch, setValue, trigger } = form
  const watchedValues = watch(["tipeHewanId", "quantity", "isKolektif"])

  // Update selected animal and total amount
  useEffect(() => {
    const [tipeHewanId, quantity, isKolektif] = watchedValues
    
    if (tipeHewanId) {
      const animal = tipeHewan.find((t) => t.id.toString() === tipeHewanId)
      setSelectedAnimal(animal || null)
      
      if (animal) {
        const price = isKolektif && animal.hargaKolektif 
          ? animal.hargaKolektif 
          : animal.harga
        setTotalAmount(price * (quantity || 1))
      }
    } else {
      setSelectedAnimal(null)
      setTotalAmount(0)
    }
  }, [watchedValues, tipeHewan])

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmitForm = async (data: QurbanFormValues) => {
    setIsSubmitting(true)
    
    try {
      const result = await onSubmit(data)
      
      if (result.success) {
        toast({
          title: "Berhasil!",
          description: mode === "admin" 
            ? "Data pengqurban berhasil ditambahkan" 
            : "Pemesanan qurban berhasil dibuat",
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

  const getFieldsForStep = (step: number): (keyof QurbanFormValues)[] => {
    switch (step) {
      case 0: // Animal selection
        return ["tipeHewanId", "quantity"]
      case 1: // Personal info
        return ["nama_pengqurban", "email", "phone", "alamat"]
      case 2: // Preferences
        return [] // No required fields
      case 3: // Payment
        return ["cara_bayar"]
      default:
        return []
    }
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100
  const Icon = STEPS[currentStep].icon;
  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                  ${isCompleted 
                    ? "bg-green-500 border-green-500 text-white" 
                    : isActive 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-muted-foreground text-muted-foreground"
                  }
                `}>
                  {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <div className="text-center mt-2">
                  <div className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmitForm)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {STEPS[currentStep].title}
              </CardTitle>
              <CardDescription>{STEPS[currentStep].description}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Step 1: Animal Selection */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="tipeHewanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pilih Jenis Hewan</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-3"
                          >
                            {tipeHewan.map((tipe) => (
                              <div key={tipe.id} className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-muted/50">
                                <RadioGroupItem value={tipe.id.toString()} id={`tipe-${tipe.id}`} className="mt-1" />
                                <div className="flex-1">
                                  <Label htmlFor={`tipe-${tipe.id}`} className="font-medium cursor-pointer">
                                    {tipe.icon} {tipe.nama}
                                  </Label>
                                  <p className="text-sm text-muted-foreground mt-1">{tipe.note}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary">
                                      Rp {tipe.harga.toLocaleString("id-ID")}
                                    </Badge>
                                    {tipe.hargaKolektif && (
                                      <Badge variant="outline">
                                        Kolektif: Rp {tipe.hargaKolektif.toLocaleString("id-ID")}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
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
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
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
                        <span className="text-xl font-bold text-primary">
                          Rp {totalAmount.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
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
                          <FormDescription>
                            Kosongkan jika qurban untuk diri sendiri
                          </FormDescription>
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
                </div>
              )}

              {/* Step 3: Preferences */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="mengambilDaging"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Mengambil Daging Qurban</FormLabel>
                            <FormDescription>
                              Saya ingin mengambil bagian daging dari hewan qurban
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
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Menyaksikan Penyembelihan</FormLabel>
                            <FormDescription>
                              Saya ingin hadir saat penyembelihan hewan qurban
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="pesan_khusus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pesan Khusus</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Pesan khusus untuk panitia (opsional)"
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
                          <Textarea 
                            {...field} 
                            placeholder="Keterangan tambahan (opsional)"
                            className="min-h-20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 4: Payment */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="cara_bayar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metode Pembayaran</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-3"
                          >
                            <div className="flex items-start space-x-3 border rounded-lg p-4">
                              <RadioGroupItem value={CaraBayar.TRANSFER} id="transfer" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="transfer" className="font-medium cursor-pointer">
                                  Transfer Bank
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Transfer ke rekening Bank Syariah Indonesia (BSI)<br/>
                                  <strong>7190671254</strong> a.n. Panitia Qurban
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 border rounded-lg p-4">
                              <RadioGroupItem value={CaraBayar.TUNAI} id="tunai" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="tunai" className="font-medium cursor-pointer">
                                  Pembayaran Tunai
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Pembayaran tunai dapat dilakukan di sekretariat panitia qurban
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {mode === "admin" && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Pengaturan Admin</h4>
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
                                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
                                      {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarInput mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                              <FormDescription>
                                Masukkan jumlah yang sudah dibayar
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="kodeResi"
                          render={({ field }) => (
                            <FormItem> 
                              <FormLabel>Kode Resi</FormLabel>
                              <FormControl>
                                <Input
                                  id="kodeResi"
                                  placeholder="Masukkan kode resi (opsional)"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Masukkan kode resi setelah pembayaran lunas
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

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
                </div>
              )}
            </CardContent>

            {/* Navigation */}
            <div className="flex justify-between p-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? onCancel : handlePrevious}
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {currentStep === 0 ? "Batal" : "Sebelumnya"}
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                  Selanjutnya
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : mode === "admin" ? "Simpan Data" : "Pesan Sekarang"}
                </Button>
              )}
            </div>
          </Card>
        </form>
      </Form>
    </div>
  )
}