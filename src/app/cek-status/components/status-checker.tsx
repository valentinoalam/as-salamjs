"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Phone, Send, Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requestOtp, verifyOtp } from "../actions"
import { QurbanStatus } from "./qurban-status"
import { QurbanCoupon } from "./qurban-coupon"

export function StatusChecker() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [qurbanData, setQurbanData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"status" | "coupon">("status")

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Masukkan nomor telepon yang valid")
      return
    }

    setIsRequestingOtp(true)

    try {
      const result = await requestOtp(phoneNumber)

      if (result.success) {
        toast.success("Kode OTP telah dikirim ke nomor telepon Anda")
      } else {
        toast.error(result.message || "Gagal mengirim OTP")
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengirim OTP")
      console.error(error)
    } finally {
      setIsRequestingOtp(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp || otp.length !== 6) {
      toast.error("Masukkan kode OTP 6 digit")
      return
    }

    setIsVerifyingOtp(true)

    try {
      const result = await verifyOtp(phoneNumber, otp)

      if (result.success) {
        setIsVerified(true)
        setQurbanData(result.data)
        toast.success("Verifikasi berhasil")
      } else {
        toast.error(result.message || "Kode OTP tidak valid")
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat verifikasi OTP")
      console.error(error)
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const resetForm = () => {
    setIsVerified(false)
    setQurbanData(null)
    setOtp("")
    setPhoneNumber("")
    setActiveTab("status")
  }

  if (isVerified && qurbanData) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-green-800">Informasi Qurban</h2>
          <Button variant="ghost" size="sm" onClick={resetForm}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Cek Lainnya
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "status" | "coupon")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status Qurban</TabsTrigger>
            <TabsTrigger value="coupon">Cetak Kupon</TabsTrigger>
          </TabsList>
          <TabsContent value="status">
            <QurbanStatus data={qurbanData} />
          </TabsContent>
          <TabsContent value="coupon">
            <QurbanCoupon data={qurbanData} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-green-800 mb-4">Verifikasi Identitas</h2>

      {!otp ? (
        <form onSubmit={handleRequestOtp}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <div className="flex">
                <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08123456789"
                  className="rounded-l-none"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Masukkan nomor telepon yang terdaftar saat pendaftaran qurban
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isRequestingOtp}>
              {isRequestingOtp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim OTP...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Kirim Kode OTP
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Kode OTP</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Masukkan kode 6 digit"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                className="text-center tracking-widest text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Masukkan kode OTP yang telah dikirim ke nomor {phoneNumber}
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOtp("")}>
                Kembali
              </Button>
              <Button type="submit" className="flex-1" disabled={isVerifyingOtp}>
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifikasi...
                  </>
                ) : (
                  "Verifikasi"
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
