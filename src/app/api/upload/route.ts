import { NextResponse } from "next/server"
import { getGoogleClient } from "@/lib/gClient"
import { google } from "googleapis"
import { Readable } from "stream"

// Google Drive folder ID where images will be stored
// You should create a folder in your Google Drive and put its ID here
const FOLDER_ID = "1nJRLmtv33xU4NnTPINIUmA26EvCowXGM"

export async function POST(request: Request) {
  try {
    const { image, fileName } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }
    // Validate image format
    const imageType = image.match(/^data:(image\/\w+);base64,/)?.[1]
    if (!imageType || !['image/jpeg', 'image/png'].includes(imageType)) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 })
    }
    // Remove the data:image/jpeg;base64, part
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Get Google client
    const client = await getGoogleClient()
    if (!client) {
      return NextResponse.json({ error: "Google authentication failed" }, { status: 500 })
    }
    const drive = google.drive({ version: "v3", auth: client })
    // Create readable stream from buffer
    const readableStream = new Readable()
    readableStream.push(buffer)
    readableStream.push(null)
    // Upload file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName || `id_card_${Date.now()}.${imageType.split('/')[1]}`,
        mimeType: imageType,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: imageType,
        body: readableStream,
      },
      supportsAllDrives: true,
      fields: 'id',
    })

    if (!response.data.id) {
      throw new Error("Failed to upload file to Google Drive")
    }

    // Make the file viewable with the link
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    })

    // Get the file's web view link
    const fileData = await drive.files.get({
      fileId: response.data.id,
      fields: "webViewLink, webContentLink",
    })

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      webViewLink: fileData.data.webViewLink,
      webContentLink: fileData.data.webContentLink,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" }, 
      { status: 500 })
  }
}

