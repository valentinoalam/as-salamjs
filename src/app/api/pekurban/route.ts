import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pekurbanSchema } from '@/schemas/pekurban';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contact: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    
    const pekurbans = await prisma.pekurban.findMany({
      where,
      include: {
        qurbanTransactions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(pekurbans);
  } catch (error) {
    console.error('Error fetching pekurbans:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    
    const pekurban = await prisma.pekurban.create({
      data: {
        name,
        contact,
        address,
      },
    });
    
    return NextResponse.json(pekurban, { status: 201 });
  } catch (error) {
    console.error('Error creating pekurban:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}