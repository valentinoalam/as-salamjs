// app/api/mudhohi/[mudhohiId]/payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '#@/lib/server/prisma.ts'
import { PaymentStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { mudhohiId: string } }
) {
  try {
    const mudhohiId = await params.mudhohiId
    const body = await req.json()
    const { paymentStatus, dibayarkan, kodeResi } = body

    // Validate input
    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'Invalid payment status' },
        { status: 400 }
      )
    }

    const updatedPayment = await prisma.pembayaran.update({
      where: { mudhohiId },
      data: {
        paymentStatus,
        dibayarkan: dibayarkan !== undefined ? Number(dibayarkan) : undefined,
        kodeResi: kodeResi || undefined
      },
      include: {
        mudhohi: {
          include: {
            hewan: true
          }
        }
      }
    })
    revalidatePath("/dashboard/mudhohi")
    return NextResponse.json({
      success: true,
      payment: updatedPayment
    })
  } catch (error) {
    console.error('[UPDATE_PAYMENT_ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}