import type { CustomGroup } from "@/types/settings";
import { prisma } from "#@/lib/server/prisma.ts";
import type { ApiResponse } from "#@/lib/DTOs/global.ts";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate input
    if (!data.name || data.itemCount === undefined || data.animalType === undefined) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Missing required fields"
      }, { status: 400 });
    }

    // Create new custom group
    const newGroup = await prisma.customGroup.create({
      data: {
        name: data.name,
        itemCount: data.itemCount,
        description: data.description || "",
        animalType: data.animalType,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });

    return NextResponse.json<ApiResponse<CustomGroup>>({
      success: true,
      data: newGroup
    });
  } catch (error) {
    console.error("Error creating custom group:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}