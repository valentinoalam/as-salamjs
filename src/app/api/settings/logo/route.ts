import type { LogoSettings } from "@/types/settings";
import { prisma } from "#@/lib/server/prisma.ts";
import { type ApiResponse } from "#@/lib/DTOs/global.ts";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    const data: LogoSettings = await req.json();

    // No longer need a rigid validation for both fields to be present
    // as we'll handle partial updates or nulls flexibly.
    // However, you might still want to ensure 'data' is not completely empty
    if (Object.keys(data).length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "No update data provided"
      }, { status: 400 });
    }

    const updates = [];

    // Iterate over the keys in the received data object
    // and dynamically create upsert operations for each
    for (const key of Object.keys(data) as Array<keyof LogoSettings>) {
      let value = data[key];

      // Handle null/undefined values: convert them to empty strings for storage
      // This aligns with how you might handle default fallbacks on the frontend
      // and ensures 'value' for Prisma is always a string.
      if (value === null || value === undefined) {
        value = ''; // Store as empty string if null or undefined
      }

      updates.push(
        prisma.setting.upsert({
          where: { key },
          update: { value: value as string }, // Cast value to string, as Prisma expects string for 'value' field
          create: { key, value: value as string }
        })
      );
    }

    // Execute all upsert operations in a single transaction for atomicity
    await prisma.$transaction(updates);

    return NextResponse.json<ApiResponse<LogoSettings>>({
      success: true,
      data // Return the updated data back to the client
    });
  } catch (error) {
    console.error("Error updating logo settings:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}