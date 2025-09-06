/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { getGoogleClient } from "#@/lib/utils/gClient.ts";
import prisma from "#@/lib/server/prisma.ts";
import { processSheetData } from "#@/lib/server/repositories/mudhohi.ts";


export async function POST(request: Request) {
  try {
    const { sheetId, sheetName = "Sheet1", userId } = await request.json()

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Initialize Google Sheets API
    const client = await getGoogleClient(["https://www.googleapis.com/auth/spreadsheets.readonly"])
    const doc = new GoogleSpreadsheet(sheetId, client)
    await doc.loadInfo()
    const sheet = doc.sheetsByTitle[sheetName]
    if (!sheet) {
      return NextResponse.json({ error: `Sheet "${sheetName}" not found` }, { status: 404 });
    }
    // Extract headers directly from sheet.headerValues
    // sheet.headerValues automatically contains the values from the first row
    const headers = sheet.headerValues.map((header: string) => header.toLowerCase().trim().replace(/\s+/g, "_"));
    const rows = await sheet.getRows()

    if (!rows || rows.length === 0) {
      if (headers.length === 0) {
        return NextResponse.json({ error: "Sheet is empty, no headers or data found" }, { status: 404 });
      }
      return NextResponse.json({ error: "No data found in the sheet" }, { status: 404 })
    }

    // Process data rows (skip header row)
    const results = await processSheetData(rows.slice(1), headers, userId)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${results.success} records. Failed: ${results.failed}`,
      data: results.data,
    })
  } catch (error: any) {
    console.error("Error importing from Google Sheets:", error)
    return NextResponse.json({ error: error.message || "Failed to import data from Google Sheets" }, { status: 500 })
  }
}
