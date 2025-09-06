import type { HeroImage } from "#@/types/settings.ts";
import prisma from "#@/lib/server/prisma.ts";

/**
 * Fetches all image records from the database.
 * @returns A promise that resolves to an array of Image objects.
 */
export async function getAllImages() {
  try {
    const images = await prisma.image.findMany({
      orderBy: {
        createdAt: 'desc', // Order by creation date, newest first
      },
    });
    return images;
  } catch (error) {
    console.error('Error fetching all images:', error);
    throw new Error('Failed to retrieve all images.');
  }
}

/**
 * Fetches a single image record by its ID.
 * @param id The unique ID of the image.
 * @returns A promise that resolves to an Image object or null if not found.
 */
export async function getImageById(id: string) {
  try {
    const image = await prisma.image.findUnique({
      where: { id },
    });
    return image;
  } catch (error) {
    console.error(`Error fetching image with ID ${id}:`, error);
    throw new Error(`Failed to retrieve image with ID: ${id}.`);
  }
}

/**
 * Fetches image records by an array of IDs.
 * @param ids An array of image IDs to fetch.
 * @returns A promise that resolves to an array of Image objects.
 */
export async function getImagesByIds(ids: string[]): Promise<HeroImage[]> {
  if (ids.length === 0) {
    return [];
  }
  try {
    const images = await prisma.image.findMany({
      where: {
        id: {
          in: ids, // Use Prisma's 'in' operator to find by multiple IDs
        },
      },
      orderBy: {
        createdAt: 'asc', // Or any other preferred order
      },
    });
    // Ensure `createdAt` is returned as ISO string for `HeroImage` type compatibility on frontend
    return images.map(({alt, width, height, size, createdAt, ...rest})=>({
      ...rest, 
      uploadedAt: createdAt.toISOString(), 
      size: size || undefined, 
      width: width || undefined, 
      height: height || undefined, 
      filename:alt || "image"
    }));
  } catch (error) {
    console.error('Error fetching images by IDs:', error);
    throw new Error('Failed to retrieve images by IDs.');
  }
}
/**
 * Fetches image records by a specific relatedType.
 * @param relatedType The type string to filter related images.
 * @returns A promise that resolves to an array of Image objects.
 */
export async function getImagesByRelatedType(relatedType: string) {
  try {
    const images = await prisma.image.findMany({
      where: {
        relatedType: relatedType,
      },
      orderBy: {
        createdAt: 'asc', // Order by creation date, oldest first
      },
    });
    return images;
  } catch (error) {
    console.error(`Error fetching images by relatedType ${relatedType}:`, error);
    throw new Error(`Failed to retrieve images for related type: ${relatedType}.`);
  }
}

// --- CREATE Function ---

/**
 * Creates a new image record in the database.
 * @param data The data for the new image (at least 'url' is required).
 * @returns A promise that resolves to the newly created Image object.
 */
export async function createImage(data: {
  url: string;
  alt?: string;
  width?: number; // Added width
  height?: number; // Added height
  transactionId?: string;
  relatedId?: string;
  relatedType?: string;
}) {
  // Basic validation
  if (!data.url) {
    throw new Error('URL is required to create an image.');
  }

  try {
    const newImage = await prisma.image.create({
      data: {
        url: data.url,
        alt: data.alt,
        width: data.width,   // Pass width to Prisma
        height: data.height, // Pass height to Prisma
        transactionId: data.transactionId,
        relatedId: data.relatedId,
        relatedType: data.relatedType,
      },
    });
    return newImage;
  } catch (error) {
    console.error('Error creating image:', error);
    throw new Error('Failed to create image.');
  }
}

// --- DELETE Function ---

/**
 * Deletes an image record by its ID.
 * @param id The unique ID of the image to delete.
 * @returns A promise that resolves to the deleted Image object.
 */
export async function deleteImage(id: string) {
  try {
    const deletedImage = await prisma.image.delete({
      where: { id },
    });
    return deletedImage;
  } catch (error) {
    // Check if the error is due to a record not found
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      throw new Error(`Image with ID ${id} not found for deletion.`);
    }
    console.error(`Error deleting image with ID ${id}:`, error);
    throw new Error(`Failed to delete image with ID: ${id}.`);
  }
}

// Example usage (these would be called from your API routes or other server-side logic)
/*
async function testFunctions() {
  try {
    // Create an image
    const newImage = await createImage({
      url: 'https://example.com/test-image.jpg',
      alt: 'A test image',
      relatedType: 'test-category'
    });
    console.log('Created image:', newImage);

    // Get all images
    const allImages = await getAllImages();
    console.log('All images:', allImages);

    // Get image by ID
    if (newImage) {
      const fetchedImage = await getImageById(newImage.id);
      console.log('Fetched image by ID:', fetchedImage);
    }

    // Get images by related type
    const imagesByCategory = await getImagesByRelatedType('test-category');
    console.log('Images by category:', imagesByCategory);

    // Delete the created image
    if (newImage) {
      const deleted = await deleteImage(newImage.id);
      console.log('Deleted image:', deleted);
    }

  } catch (error) {
    console.error('Test function error:', error);
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma Client when done
  }
}

// Call the test function (only for testing, not typically in production code directly)
// testFunctions();
*/
