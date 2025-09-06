import { getImagesByRelatedType } from "#@/lib/server/repositories/image.ts"; // Adjust import if path or file name differs
import { NextResponse } from 'next/server';



/**
 * Handles GET requests to list hero images from the database.
 * These images are expected to have been created/seeded with relatedType: 'hero-banner'.
 */
export async function GET() {
  try {
    // Fetch images from the database that are designated as 'hero-banner'
    const heroImages = await getImagesByRelatedType('hero-banner');

    // Map the database response to the desired format for the client,
    // including filename (derived from URL), url, width, height, and createdAt.
    const formattedImages = heroImages.map(image => ({
      id: image.id,
      filename: image.alt || image.url.split('/').pop() || '', // Use alt or derive from URL
      url: image.url,
      width: image.width,
      height: image.height,
      uploadedAt: image.createdAt.toISOString(), // Consistent naming with your original POST response
    }));

    return NextResponse.json(formattedImages);
  } catch (error) {
    console.error("Error loading hero images from database:", error);
    return NextResponse.json(
      { error: "Failed to load hero images" },
      { status: 500 }
    );
  }
}
