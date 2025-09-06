import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { createImage } from '#@/lib/server/repositories/image.ts';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string
    // Validate inputs
    if (!file || !type) {
      return NextResponse.json(
        { error: 'Missing file or type parameter' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public/images/hero');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const extension = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const filePath = path.join(uploadDir, filename);

    // Convert to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/images/hero/${filename}`;
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    // Call the createImage function (which interacts with Prisma)
    const newImage = await createImage({
      url: publicUrl,
      alt: filename, // Use filename as alt text
      width: width ?? undefined,   // Convert to integer, or undefined if not provided
      height: height ?? undefined, // Convert to integer, or undefined if not provided
      relatedType: 'hero-banner', // Default to 'hero-banner' if not provided
    });

    return NextResponse.json({
      id: newImage.id,
      filename: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
      width: newImage.width,
      height: newImage.height,
      uploadedAt: newImage.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add file type validation middleware
export async function middleware(request: NextRequest) {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Invalid content type' },
      { status: 415 }
    );
  }
  return NextResponse.next();
}
