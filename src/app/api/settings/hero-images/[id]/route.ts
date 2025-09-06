import { NextRequest, NextResponse } from "next/server"
import { unlink } from "fs/promises"
import { join } from "path"

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  // Security check
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const heroImagesPath = join(process.cwd(), "public", "images", "hero");
    const filePath = join(heroImagesPath, filename);
    
    await unlink(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting server image:", error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
