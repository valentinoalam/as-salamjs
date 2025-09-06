
import type { ApiResponse } from "#@/lib/DTOs/global.ts";
import prisma from "#@/lib/server/prisma.ts";
import type { CustomGroup } from "#@/types/settings.ts";
import { NextRequest, NextResponse } from "next/server";


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const data = await req.json();
    
    // Validate ID exists
    const existing = await prisma.customGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Group not found"
      }, { status: 404 });
    }

    // Update group
    const updatedGroup = await prisma.customGroup.update({
      where: { id },
      data: {
        name: data.name || existing.name,
        itemCount: data.itemCount ?? existing.itemCount,
        description: data.description ?? existing.description,
        animalType: data.animalType || existing.animalType,
        isActive: data.isActive ?? existing.isActive
      }
    });

    return NextResponse.json<ApiResponse<CustomGroup>>({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error("Error updating custom group:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    
    // Validate ID exists
    const existing = await prisma.customGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Group not found"
      }, { status: 404 });
    }

    // Delete group
    await prisma.customGroup.delete({ where: { id } });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { message: "Group deleted successfully" }
    });
  } catch (error) {
    console.error("Error deleting custom group:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}