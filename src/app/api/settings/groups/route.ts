import type { GroupSettings } from "@/types/settings";
import type { ApiResponse } from "#@/lib/DTOs/global.ts";
import { NextRequest, NextResponse } from "next/server";
import { renameAllHewanWithGroups } from "#@/lib/server/services/id.ts";

export async function PUT(req: NextRequest) {
  try {
    const data: GroupSettings = await req.json();
    
    // Validate input
    if (data.itemsPerGroup === undefined) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "Missing required fields"
      }, { status: 400 });
    }

    // Update settings in database

    await renameAllHewanWithGroups(data.itemsPerGroup)
    return NextResponse.json<ApiResponse<GroupSettings>>({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error updating group settings:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}