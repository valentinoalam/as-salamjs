import type { ApiResponse } from "#@/lib/DTOs/global.ts";
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "#@/lib/server/prisma.ts";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: "No file uploaded"
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `logo-${Date.now()}${path.extname(file.name)}`;
    
    // Save to public directory
    const publicDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(publicDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;

    // Update logo setting
    await prisma.setting.upsert({
      where: { key: "logoTitle" },
      update: { value: url },
      create: { key: "logoTitle", value: url }
    });

    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url }
    });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}