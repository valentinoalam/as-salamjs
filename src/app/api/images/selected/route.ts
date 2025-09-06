import { NextRequest, NextResponse } from "next/server";
import { getImagesByIds } from "#@/lib/server/repositories/image.ts"; // Import the new function

/**
 * Handles POST requests to fetch selected hero images by their IDs.
 * Expects an array of image IDs in the request body.
 */
export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json(); // Expects { ids: string[] }

    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
      return NextResponse.json(
        { error: "Invalid request body: 'ids' must be an array of strings." },
        { status: 400 }
      );
    }

    const selectedImages = await getImagesByIds(ids);
    return NextResponse.json(selectedImages);
  } catch (error) {
    console.error("Error fetching selected images:", error);
    return NextResponse.json(
      { error: "Failed to fetch selected images" },
      { status: 500 }
    );
  }
}
