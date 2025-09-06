// app/api/kupon/route.ts
import { getCouponData } from '#@/lib/server/repositories/qurban.ts';
import { NextResponse } from 'next/server';

/**
 * Handles GET requests to fetch Kupon data.
 * @param request The incoming NextRequest object.
 * @returns A NextResponse object containing the Kupon data or an error message.
 */
export async function GET() {
  try {
    // You can add query parameters if needed, e.g., for filtering or pagination
    // const { searchParams } = new URL(request.url);
    // const status = searchParams.get('status');

    const kupons = await getCouponData();

    // Return the fetched data as a JSON response
    return NextResponse.json({ success: true, data: kupons }, { status: 200 });

  } catch (error) {
    console.error('Error fetching kupon data:', error);

    // Return an error response
    return NextResponse.json(
      { success: false, message: 'Failed to fetch kupon data.', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 } // Internal Server Error
    );
  }
}

// You can also define other HTTP methods (POST, PUT, DELETE) in the same file:
// export async function POST(request: NextRequest) { /* ... */ }
// export async function PUT(request: NextRequest) { /* ... */ }
// export async function DELETE(request: NextRequest) { /* ... */ }