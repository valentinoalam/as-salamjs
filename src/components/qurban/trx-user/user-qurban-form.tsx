"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CaraBayar, PaymentStatus } from "@prisma/client"
import { ChevronLeft, ChevronRight, Check, Calendar, User, CreditCard, ShoppingBasket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { AnimalSelectionCard } from "./animal-selection-card"
import { userQurbanSchema, type UserQurbanFormValues } from "@/lib/zod/qurban-form"
import type { TipeHewan, TipeHewanWithImages } from "@/types/keuangan"
import { ProductSelectionCard } from "./product-selection-card"; // New component

type Step = {
  id: string
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const STEPS: Step[] = [
  {
    id: "animal",
    title: "Pilih Hewan Qurban",
    description: "Pilih jenis dan jumlah hewan qurban",
    icon: Calendar,
  },
  {
    id: "personal",
    title: "Data Pengqurban",
    description: "Isi data diri pengqurban",
    icon: User,
  },
  {
    id: "payment",
    title: "Pembayaran",
    description: "Metode dan informasi pembayaran",
    icon: CreditCard,
  },
  {
    id: "products",
    title: "Pilih Jatah Daging",
    description: "Pilih produk daging yang diinginkan",
    icon: ShoppingBasket,
  },
]

interface UserQurbanFormProps {
  tipeHewan: TipeHewanWithImages[]
  onSubmit: (data: UserQurbanFormValues) => Promise<{ success: boolean; error?: string; mudhohiId?: string }>
  onCancel?: () => void
  initialData?: Partial<UserQurbanFormValues>
}

export function UserQurbanForm({ tipeHewan, onSubmit, onCancel, initialData }: UserQurbanFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<TipeHewan | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initialData?.jatahPengqurban || []);
  const form = useForm<UserQurbanFormValues>({
    resolver: zodResolver(userQurbanSchema),
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
      cara_bayar: initialData?.cara_bayar || CaraBayar.TRANSFER,
      jatahPengqurban: initialData?.jatahPengqurban || [],
    },
  })

  const { watch, setValue, trigger } = form
  const watchedValues = watch(["tipeHewanId", "quantity", "isKolektif"])

  // Update selected animal and total amount
  const updateAnimalAndTotal = () => {
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
  }

  // Update animal and total when form values change
  useState(() => {
    updateAnimalAndTotal()
  })

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

  const handleSubmitForm = async (data: UserQurbanFormValues) => {
    setIsSubmitting(true)

    try {
      // Automatically set payment status to MENUNGGU_KONFIRMASI for user submissions
      const submissionData = {
        ...data,
        paymentStatus: PaymentStatus.MENUNGGU_KONFIRMASI,
        dibayarkan: 0, // User hasn't paid yet, just submitted the order
        createdAt: new Date(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await onSubmit(submissionData as any)
      if (result.success) {
        toast({
          title: "Berhasil!",
          description: "Pemesanan qurban berhasil dibuat",
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

  const getFieldsForStep = (step: number): (keyof UserQurbanFormValues)[] => {
    switch (step) {
      case 0: // Animal selection
        return ["tipeHewanId", "quantity"]
      case 1: // Personal info
        return ["nama_pengqurban", "email", "phone", "alamat"]
      case 2: // Payment
        return ["cara_bayar"]
      case 3: return ["jatahPengqurban"]; // New validation
      default:
        return []
    }
  }

  const handleAnimalSelection = (values: { tipeHewanId: string; quantity: number; isKolektif: boolean }) => {
    setValue("tipeHewanId", values.tipeHewanId)
    setValue("quantity", values.quantity)
    setValue("isKolektif", values.isKolektif)
    updateAnimalAndTotal()
    setCurrentStep(1) // Move to personal info step
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100
  const Icon = STEPS[currentStep].icon

  // Skip rendering the step navigation for the first step
  if (currentStep === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Pilih Hewan Qurban</CardTitle>
            <CardDescription>Pilih jenis dan jumlah hewan qurban yang Anda inginkan</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimalSelectionCard
              tipeHewan={tipeHewan}
              onCancel={onCancel}
              onSelect={handleAnimalSelection}
              defaultValues={{
                tipeHewanId: form.getValues("tipeHewanId"),
                quantity: form.getValues("quantity"),
                isKolektif: form.getValues("isKolektif"),
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

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
                <div
                  className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                  ${
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : isActive
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground text-muted-foreground"
                  }
                `}
                >
                  {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <div className="text-center mt-2">
                  <div className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{step.description}</div>
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
                            <FormDescription>Saya ingin mengambil bagian daging dari hewan qurban</FormDescription>
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
                            <FormLabel>Menyaksikan Penyembelihan</FormLabel>
                            <FormDescription>Saya ingin hadir saat penyembelihan hewan qurban</FormDescription>
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
                          <Textarea {...field} placeholder="Keterangan tambahan (opsional)" className="min-h-20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="cara_bayar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metode Pembayaran</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-3">
                            <div className="flex items-start space-x-3 border rounded-lg p-4">
                              <RadioGroupItem value={CaraBayar.TRANSFER} id="transfer" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="transfer" className="font-medium cursor-pointer">
                                  Transfer Bank
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Transfer ke rekening Bank Syariah Indonesia (BSI)
                                  <br />
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
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-6">
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
              <Button type="button" variant="outline" onClick={handlePrevious} disabled={isSubmitting}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Sebelumnya
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                  Selanjutnya
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Pesan Sekarang"}
                </Button>
              )}
            </div>
          </Card>
        </form>
      </Form>
    </div>
  )
}
