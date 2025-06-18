"use server"

import prisma from "@/lib/prisma"

// Simulate OTP generation and storage
// In a real application, you would use a proper OTP service and database
const otpStore = new Map<string, { otp: string; expires: Date }>()

/**
 * Generate and send OTP to the user's phone number
 */
export async function requestOtp(phoneNumber: string) {
  try {
    // Check if the phone number exists in the database
    const qurban = await prisma.hewanQurban.findFirst({
      where: {
        shohibPhone: phoneNumber,
      },
    })

    if (!qurban) {
      return {
        success: false,
        message: "Nomor telepon tidak terdaftar dalam sistem",
      }
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP with 5-minute expiration
    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + 5)

    otpStore.set(phoneNumber, { otp, expires })

    // In a real application, you would send the OTP via SMS
    console.log(`OTP for ${phoneNumber}: ${otp}`)

    return {
      success: true,
      message: "OTP berhasil dikirim",
    }
  } catch (error) {
    console.error("Error requesting OTP:", error)
    return {
      success: false,
      message: "Terjadi kesalahan saat mengirim OTP",
    }
  }
}

/**
 * Verify OTP and return qurban data if valid
 */
export async function verifyOtp(phoneNumber: string, otp: string) {
  try {
    const storedOtp = otpStore.get(phoneNumber)

    // Check if OTP exists and is valid
    if (!storedOtp) {
      return {
        success: false,
        message: "OTP tidak ditemukan. Silakan minta OTP baru",
      }
    }

    // Check if OTP has expired
    if (new Date() > storedOtp.expires) {
      otpStore.delete(phoneNumber)
      return {
        success: false,
        message: "OTP telah kedaluwarsa. Silakan minta OTP baru",
      }
    }

    // Check if OTP matches
    if (storedOtp.otp !== otp) {
      return {
        success: false,
        message: "Kode OTP tidak valid",
      }
    }

    // OTP is valid, fetch qurban data
    const qurban = await prisma.hewanQurban.findFirst({
      where: {
        shohibPhone: phoneNumber,
      },
      select: {
        id: true,
        animalId: true,
        type: true,
        status: true,
        shohibName: true,
        shohibPhone: true,
        meatPackageCount: true,
        processedAt: true,
      },
    })

    if (!qurban) {
      return {
        success: false,
        message: "Data qurban tidak ditemukan",
      }
    }

    // Clear OTP after successful verification
    otpStore.delete(phoneNumber)

    return {
      success: true,
      data: qurban,
    }
  } catch (error) {
    console.error("Error verifying OTP:", error)
    return {
      success: false,
      message: "Terjadi kesalahan saat verifikasi OTP",
    }
  }
}
