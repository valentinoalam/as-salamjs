import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "#@/lib/server/prisma.ts"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const relatedId = formData.get("relatedId") as string
    const relatedType = formData.get("relatedType") as string
    const alt = formData.get("alt") as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (!relatedId || !relatedType) {
      return NextResponse.json({ error: "relatedId and relatedType are required" }, { status: 400 })
    }

    const tipeHewan = await prisma.tipeHewan.findUnique({ 
      where: { id: parseInt(relatedId) },
      select: {
        nama: true,
        jenis: true
      }
    })
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public/hewan")
    await mkdir(uploadsDir, { recursive: true })
    const uploadedImages = []
    const imageUrls = []
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
      }

      // Upload to Vercel Blob
      const uniqueFilename = `${uuidv4()}-${file.name.replace(/\s+/g, "-")}`
      const filePath = join(uploadsDir, uniqueFilename)

      // Convert file to buffer and save it
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      await writeFile(filePath, buffer)
      const imageUrl = `/hewan/${uniqueFilename}`
      imageUrls.push(imageUrl)

      // Save to database
      const image = await prisma.image.create({
        data: {
          url: imageUrl,
          alt: alt || `${tipeHewan?.jenis}-${tipeHewan?.nama}.  Sumber: ${file.name}`,
          relatedId,
          relatedType,
        },
      })

      uploadedImages.push(image)
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
    })
  } catch (error) {
    console.error("Error uploading images:", error)
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 })
  }
}
