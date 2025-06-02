"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronRight } from "lucide-react"
import type { TipeHewanWithImages } from "@/types/keuangan"


const animalSelectionSchema = z.object({
  tipeHewanId: z.string().min(1, "Pilih jenis hewan terlebih dahulu"),
  quantity: z.coerce.number().min(1, "Jumlah minimal 1 ekor"),
  isKolektif: z.boolean(),
})

type AnimalSelectionValues = z.infer<typeof animalSelectionSchema>

interface AnimalSelectionCardProps {
  tipeHewan: TipeHewanWithImages[]
  onCancel?: () => void
  onSelect: (values: AnimalSelectionValues) => void
  defaultValues?: Partial<AnimalSelectionValues>
}

export function AnimalSelectionCard({ tipeHewan, onCancel, onSelect, defaultValues }: AnimalSelectionCardProps) {
  const [selectedAnimal, setSelectedAnimal] = useState<TipeHewanWithImages | null>(
    defaultValues?.tipeHewanId ? tipeHewan.find((t) => t.id.toString() === defaultValues.tipeHewanId) || null : null,
  )
  const [totalAmount, setTotalAmount] = useState(0)

  const form = useForm<AnimalSelectionValues>({
    resolver: zodResolver(animalSelectionSchema),
    defaultValues: {
      tipeHewanId: defaultValues?.tipeHewanId || "",
      quantity: defaultValues?.quantity || 1,
      isKolektif: defaultValues?.isKolektif || false,
    },
  })

  // Update selected animal and total amount when values change
  const handleAnimalChange = (tipeHewanId: string) => {
    const animal = tipeHewan.find((t) => t.id.toString() === tipeHewanId)
    setSelectedAnimal(animal || null)

    if (animal) {
      const quantity = form.getValues("quantity") || 1
      const isKolektif = form.getValues("isKolektif")
      const price = isKolektif && animal.hargaKolektif ? animal.hargaKolektif : animal.harga
      setTotalAmount(price * quantity)
    } else {
      setTotalAmount(0)
    }

    form.setValue("tipeHewanId", tipeHewanId)
  }

  const handleQuantityChange = (value: number) => {
    form.setValue("quantity", value)

    if (selectedAnimal) {
      const isKolektif = form.getValues("isKolektif")
      const price = isKolektif && selectedAnimal.hargaKolektif ? selectedAnimal.hargaKolektif : selectedAnimal.harga
      setTotalAmount(price * value)
    }
  }

  const handleKolektifChange = (checked: boolean) => {
    form.setValue("isKolektif", checked)

    if (selectedAnimal) {
      const quantity = form.getValues("quantity") || 1
      const price = checked && selectedAnimal.hargaKolektif ? selectedAnimal.hargaKolektif : selectedAnimal.harga
      setTotalAmount(price * quantity)
    }
  }

  const handleSubmit = form.handleSubmit((data) => {
    onSelect(data)
  })

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-green-600 mb-2">Pilih Hewan Qurban</h2>
        <p className="text-green-500">Pilih jenis hewan qurban yang Anda inginkan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tipeHewan.map((tipe) => (
          <Card
            key={tipe.id}
            className={`cursor-pointer transition-all hover:shadow-lg hover:border-green-500 ${
              selectedAnimal?.id === tipe.id ? "border-2 border-green-500 shadow-lg" : "border border-gray-200"
            }`}
            onClick={() => handleAnimalChange(tipe.id.toString())}
          >
            <CardContent className="p-6">
              <RadioGroup className="flex items-start gap-3 mb-4">
                <RadioGroupItem
                  value={tipe.id.toString()}
                  id={`tipe-${tipe.id}`}
                  className="mt-1"
                  checked={selectedAnimal?.id === tipe.id}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => handleAnimalChange(tipe.id.toString())}
                />
                <div className="flex-1">
                  <Label htmlFor={`tipe-${tipe.id}`} className="font-semibold text-green-600 cursor-pointer text-lg">
                    {tipe.icon} {tipe.nama}
                  </Label>
                </div>
              </RadioGroup>

              <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                <Image
                  src={tipe.images[0].url || "/placeholder.svg?height=200&width=300"}
                  alt={tipe.images[0].alt}
                  fill
                  className="object-cover border-2 border-gray-900"
                />
              </div>

              <p className="text-sm text-gray-600 mb-4">{tipe.note}</p>

              <div className="flex flex-col gap-2">
                <Badge className="bg-yellow-400 text-gray-900 font-bold w-fit">
                  Rp {tipe.harga.toLocaleString("id-ID")}
                </Badge>
                {tipe.hargaKolektif && (
                  <Badge variant="outline" className="border-green-600 text-green-600 w-fit">
                    Kolektif: Rp {tipe.hargaKolektif.toLocaleString("id-ID")}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedAnimal && (
        <Card className="mt-8 border-green-200 bg-green-50">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-green-700 mb-2">Konfigurasi {selectedAnimal.nama}</h3>
              <p className="text-green-600">Atur jumlah dan opsi qurban Anda</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-green-700 font-medium">
                  Jumlah Hewan
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={form.getValues("quantity")}
                  onChange={(e) => handleQuantityChange(Number(e.target.value) || 1)}
                  className="border-green-300 focus:border-green-500"
                />
                {form.formState.errors.quantity && (
                  <p className="text-sm text-red-600">{form.formState.errors.quantity.message}</p>
                )}
              </div>

              {selectedAnimal.hargaKolektif && (
                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-green-300 p-4 bg-white">
                  <Checkbox
                    id="isKolektif"
                    checked={form.getValues("isKolektif")}
                    onCheckedChange={handleKolektifChange}
                    className="border-green-500 data-[state=checked]:bg-green-500"
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="isKolektif" className="text-green-700 font-medium">
                      Qurban Kolektif
                    </Label>
                    <p className="text-sm text-green-600">
                      Harga: Rp {selectedAnimal.hargaKolektif.toLocaleString("id-ID")} per orang
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg border border-green-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-green-700">Total Biaya:</span>
                <span className="text-2xl font-bold text-green-600">Rp {totalAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-green-200 space-x-7 p-6 flex justify-end bg-white">
            <Button type="button" variant="outline" className="px-8 py-3 font-semibold" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 font-semibold"
            >
              Lanjutkan
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
