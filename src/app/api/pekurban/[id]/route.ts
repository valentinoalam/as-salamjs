import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pekurbanSchema } from '@/schemas/pekurban';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const pekurban = await prisma.pekurban.findUnique({
      where: {
        id: params.id,
      },
      include: {
        qurbanTransactions: {
          include: {
            hewanQurban: true,
          },
        },
      },
    });
    
    if (!pekurban) {
      return NextResponse.json(
        { error: 'Pekurban tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(pekurban);
  } catch (error) {
    console.error('Error fetching pekurban:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validationResult = pekurbanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { name, contact, address } = validationResult.data;
    
    // Check if pekurban exists
    const existingPekurban = await prisma.pekurban.findUnique({
      where: {
        id: params.id,
      },
    });
    
    if (!existingPekurban) {
      return NextResponse.json(
        { error: 'Pekurban tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Update pekurban
    const updatedPekurban = await prisma.pekurban.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        contact,
        address,
      },
    });
    
    return NextResponse.json(updatedPekurban);
  } catch (error) {
    console.error('Error updating pekurban:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Check if pekurban exists
    const existingPekurban = await prisma.pekurban.findUnique({
      where: {
        id: params.id,
      },
      include: {
        qurbanTransactions: true,
      },
    });
    
    if (!existingPekurban) {
      return NextResponse.json(
        { error: 'Pekurban tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Check if pekurban has transactions
    if (existingPekurban.qurbanTransactions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Pekurban ini memiliki transaksi qurban. Hapus transaksi terlebih dahulu.' 
        },
        { status: 400 }
      );
    }
    
    // Delete pekurban
    await prisma.pekurban.delete({
      where: {
        id: params.id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pekurban:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}